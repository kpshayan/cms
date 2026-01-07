const Task = require('../models/Task');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

const normalize = (value) => String(value || '').trim().toLowerCase();

const isTaskOwnedByUser = (task, user) => {
  if (!task?.assignee || !user) return false;
  const userIdentifiers = [user.username, user.email, user._id?.toString()].map(normalize);
  const assigneeIdentifiers = [task.assignee.username, task.assignee.email].map(normalize);
  return assigneeIdentifiers.some((identifier) => identifier && userIdentifiers.includes(identifier));
};

const serializeTask = (task) => {
  const plain = task.toObject({ versionKey: false });
  return {
    ...plain,
    id: plain._id,
  };
};

const buildTaskFilter = (req) => {
  const filter = {};
  if (req.query.projectId) {
    filter.projectId = req.query.projectId;
  }
  const canViewAll = Boolean(req.user?.permissions?.manageTasks || req.user?.permissions?.viewTasks);
  const restrictToOwnTasks = Boolean(req.user?.permissions?.viewOwnTasksOnly);
  if (!canViewAll && restrictToOwnTasks) {
    filter['assignee.username'] = req.user.username;
  }
  return filter;
};

const ensureTaskMutationAccess = (task, user) => {
  if (user?.permissions?.manageTasks) {
    return true;
  }
  if (user?.permissions?.manageOwnTasks && isTaskOwnedByUser(task, user)) {
    return true;
  }
  const err = new Error('You are not allowed to modify this task.');
  err.status = 403;
  throw err;
};

const ensureTaskViewAccess = (task, user) => {
  const hasGlobalTaskView = Boolean(user?.permissions?.manageTasks || user?.permissions?.viewTasks);
  if (hasGlobalTaskView) {
    return true;
  }

  const restrictsToOwnTasks = Boolean(user?.permissions?.viewOwnTasksOnly);
  if (!restrictsToOwnTasks && user?.permissions?.viewProjects) {
    return true;
  }

  if ((user?.permissions?.viewOwnTasksOnly || user?.permissions?.manageOwnTasks) && isTaskOwnedByUser(task, user)) {
    return true;
  }
  const err = new Error('You are not allowed to view this task.');
  err.status = 403;
  throw err;
};

exports.listTasks = asyncHandler(async (req, res) => {
  const filter = buildTaskFilter(req);
  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  return res.json(tasks.map(serializeTask));
});

exports.getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  ensureTaskViewAccess(task, req.user);
  return res.json(serializeTask(task));
});

exports.createTask = asyncHandler(async (req, res) => {
  const payload = {
    title: req.body.title,
    description: req.body.description,
    status: req.body.status || 'todo',
    priority: req.body.priority || 'medium',
    type: req.body.type || 'task',
    projectId: req.body.projectId,
    projectKey: req.body.projectKey,
    attachments: req.body.attachments || [],
    assignee: req.body.assignee || null,
  };

  if (!payload.title || !payload.projectId || !payload.projectKey) {
    return res.status(400).json({ error: 'title, projectId, and projectKey are required.' });
  }

  const project = await Project.findById(payload.projectId);
  if (!project) {
    return res.status(400).json({ error: 'Invalid projectId provided.' });
  }

  const task = await Task.create({
    ...payload,
    project: project._id,
  });

  return res.status(201).json(serializeTask(task));
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  ensureTaskMutationAccess(task, req.user);

  Object.assign(task, req.body || {});

  await task.save();
  return res.json(serializeTask(task));
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  if (!req.user?.permissions?.manageTasks) {
    const err = new Error('You are not allowed to delete tasks.');
    err.status = 403;
    throw err;
  }
  await task.deleteOne();
  return res.json({ success: true });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }
  ensureTaskMutationAccess(task, req.user);
  task.status = req.body.status || task.status;
  await task.save();
  return res.json(serializeTask(task));
});

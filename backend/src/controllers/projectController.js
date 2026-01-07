const Project = require('../models/Project');
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');
const asyncHandler = require('../utils/asyncHandler');

const buildProjectPayload = async (projectDoc) => {
  const project = await projectDoc.populate('team');
  return project;
};

const sanitizeTeamMember = (member) => {
  if (!member) return null;
  const plain = member.toObject({ versionKey: false });
  return {
    _id: plain._id,
    id: plain._id,
    name: plain.name,
    email: plain.email,
    avatar: plain.avatar,
    executorUsername: plain.executorUsername,
    role: plain.role,
    title: plain.title,
  };
};

const buildQuotationsResponse = (project, { includePdfData = false } = {}) => {
  if (!project?.quotations) {
    return {
      entries: [],
      generatedAt: null,
      pdfName: null,
      pdfAvailable: false,
      ...(includePdfData ? { pdfBase64: null } : {}),
    };
  }

  const { quotations } = project;
  const base = {
    entries: Array.isArray(quotations.entries) ? quotations.entries : [],
    generatedAt: quotations.generatedAt,
    pdfName: quotations.pdfName,
    pdfAvailable: Boolean(quotations.pdfData?.data?.length),
  };

  if (includePdfData) {
    base.pdfBase64 = quotations.pdfData?.data
      ? quotations.pdfData.data.toString('base64')
      : null;
  }

  return base;
};

const serializeProject = (project) => {
  const plain = project.toObject({ versionKey: false });
  // Avoid leaking raw Buffer data via default serialization
  const { quotations: _ignoredQuotations, ...rest } = plain;
  return {
    ...rest,
    team: Array.isArray(project.team)
      ? project.team.map(sanitizeTeamMember)
      : [],
    quotations: buildQuotationsResponse(project),
    id: plain._id,
  };
};

exports.listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().populate('team');
  return res.json(projects.map(serializeProject));
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('team');
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  return res.json(serializeProject(project));
});

exports.createProject = asyncHandler(async (req, res) => {
  const payload = {
    name: req.body.name,
    description: req.body.description,
    color: req.body.color || '#2563eb',
    key: (req.body.key || '').trim().toUpperCase(),
  };

  if (!payload.name || !payload.key) {
    return res.status(400).json({ error: 'Project name and key are required.' });
  }

  const project = await Project.create(payload);
  const hydrated = await buildProjectPayload(project);
  return res.status(201).json(serializeProject(hydrated));
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  if (req.body.name) project.name = req.body.name;
  if (req.body.description !== undefined) project.description = req.body.description;
  if (req.body.color) project.color = req.body.color;
  if (req.body.status) project.status = req.body.status;

  await project.save();
  const hydrated = await buildProjectPayload(project);
  return res.json(serializeProject(hydrated));
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  await Promise.all([
    Task.deleteMany({ projectId: String(project._id) }),
  ]);

  return res.json({ success: true });
});

exports.addTeamMember = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }

  const [project, member] = await Promise.all([
    Project.findById(req.params.id),
    TeamMember.findById(userId),
  ]);

  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  if (!member) {
    return res.status(404).json({ error: 'Team member not found.' });
  }

  const alreadyOnTeam = project.team.some((memberId) => String(memberId) === String(member._id));
  if (!alreadyOnTeam) {
    project.team.push(member._id);
    await project.save();
  }

  const hydrated = await buildProjectPayload(project);
  return res.json(serializeProject(hydrated));
});

exports.removeTeamMember = asyncHandler(async (req, res) => {
  const { id: projectId, userId } = req.params;
  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  project.team = project.team.filter((memberId) => String(memberId) !== String(userId));
  await project.save();
  const hydrated = await buildProjectPayload(project);
  return res.json(serializeProject(hydrated));
});

exports.getProjectQuotations = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  return res.json(buildQuotationsResponse(project));
});

exports.saveProjectQuotations = asyncHandler(async (req, res) => {
  const { entries, pdfBase64, pdfName, generatedAt } = req.body;

  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: 'At least one entry is required.' });
  }

  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  project.quotations = project.quotations || {};
  project.quotations.entries = entries;
  project.quotations.generatedAt = generatedAt ? new Date(generatedAt) : new Date();
  project.quotations.pdfName = pdfName || `${project.key || 'PROJECT'}-Quotations.pdf`;

  if (pdfBase64) {
    let buffer;
    try {
      buffer = Buffer.from(pdfBase64, 'base64');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid PDF payload.' });
    }
    project.quotations.pdfData = {
      data: buffer,
      contentType: 'application/pdf',
    };
  } else {
    project.quotations.pdfData = undefined;
  }

  await project.save();
  return res.json(buildQuotationsResponse(project));
});

exports.streamProjectQuotationsPdf = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const pdfBuffer = project.quotations?.pdfData?.data;
  if (!pdfBuffer || !pdfBuffer.length) {
    return res.status(404).json({ error: 'Quotations PDF not found.' });
  }

  const filename = project.quotations?.pdfName || 'Quotations.pdf';
  res.setHeader('Content-Type', project.quotations?.pdfData?.contentType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.send(pdfBuffer);
});

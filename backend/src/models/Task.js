const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: String,
  size: Number,
  type: String,
  data: String,
}, { _id: false });

const assigneeSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  avatar: String,
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'in-progress', 'hold', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  type: { type: String, enum: ['task', 'story', 'bug'], default: 'task' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectKey: { type: String, required: true },
  projectId: { type: String, required: true },
  attachments: { type: [attachmentSchema], default: [] },
  assignee: { type: assigneeSchema, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);

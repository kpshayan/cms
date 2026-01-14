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

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  author: {
    username: { type: String, trim: true },
    name: { type: String, trim: true },
    role: { type: String, trim: true },
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false, _id: true });

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
  comments: { type: [commentSchema], default: [] },
  assignee: { type: assigneeSchema, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);

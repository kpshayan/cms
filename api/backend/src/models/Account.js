const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  manageProjects: { type: Boolean, default: false },
  manageTeamMembers: { type: Boolean, default: false },
  manageTasks: { type: Boolean, default: false },
  manageOwnTasks: { type: Boolean, default: false },
  viewProjects: { type: Boolean, default: false },
  viewTasks: { type: Boolean, default: false },
  viewOwnTasksOnly: { type: Boolean, default: false },
}, { _id: false });

const accountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  role: { type: String, required: true },
  scope: { type: String, default: '' },
  avatar: { type: String, default: '' },
  isExecutor: { type: Boolean, default: false },
  passwordHash: { type: String, default: null },
  permissions: { type: permissionSchema, default: () => ({}) },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  createdBy: { type: String },
  updatedBy: { type: String },
}, { timestamps: true });

accountSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ versionKey: false });
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Account', accountSchema);

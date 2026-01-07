const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  avatar: { type: String, trim: true },
  executorUsername: { type: String, trim: true, lowercase: true },
  role: { type: String, trim: true },
  title: { type: String, trim: true },
  phone: { type: String, trim: true },
  notes: { type: String, trim: true },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);

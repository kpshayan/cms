const mongoose = require('mongoose');

const accessGroupSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['admin1', 'admin2', 'admin3', 'admin4'],
  },
  usernames: {
    type: [String],
    default: () => [],
  },
}, { timestamps: true });

module.exports = mongoose.model('AccessGroup', accessGroupSchema);

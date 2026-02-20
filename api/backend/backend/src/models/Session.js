const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionIdHash: { type: String, required: true, unique: true, index: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  expiresAt: { type: Date, required: true },
  lastUsedAt: { type: Date, default: null },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);

const mongoose = require('mongoose');

const quotationEntrySchema = new mongoose.Schema({
  key: { type: String, trim: true },
  label: { type: String, trim: true },
  value: { type: String, trim: true },
  type: { type: String, trim: true },
}, { _id: false });

const quotationVersionSchema = new mongoose.Schema({
  entries: { type: [quotationEntrySchema], default: [] },
  generatedAt: { type: Date },
  pdfName: { type: String, trim: true },
  pdfData: {
    data: Buffer,
    contentType: { type: String, default: 'application/pdf' },
  },
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, uppercase: true, unique: true },
  description: { type: String, trim: true },
  color: { type: String, default: '#2563eb' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' }],
  quotations: {
    entries: { type: [quotationEntrySchema], default: [] },
    generatedAt: { type: Date },
    pdfName: { type: String, trim: true },
    pdfData: {
      data: Buffer,
      contentType: { type: String, default: 'application/pdf' },
    },
  },
  quotationVersions: { type: [quotationVersionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);

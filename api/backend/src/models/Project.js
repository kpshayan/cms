const mongoose = require('mongoose');

const quotationEntrySchema = new mongoose.Schema({
  key: { type: String, trim: true },
  label: { type: String, trim: true },
  value: { type: String, trim: true },
  duration: { type: String, trim: true },
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

const quotationDetailsSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  production: { type: String, trim: true, default: '' },
  project: { type: String, trim: true, default: '' },
  type: { type: String, trim: true, default: '' },
  producer: { type: String, trim: true, default: '' },
  contact: { type: String, trim: true, default: '' },
}, { _id: false });

const commentSchema = new mongoose.Schema({
  text: { type: String, trim: true, required: true },
  author: {
    username: { type: String, trim: true },
    name: { type: String, trim: true },
    role: { type: String, trim: true },
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, uppercase: true, unique: true },
  description: { type: String, trim: true },
  color: { type: String, default: '#2563eb' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TeamMember' }],
  summaryComments: { type: [commentSchema], default: [] },
  quotationDetails: { type: quotationDetailsSchema, default: () => ({}) },
  quotationDetailsFinalized: { type: Boolean, default: false },
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

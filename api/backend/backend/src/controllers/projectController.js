const Project = require('../models/Project');
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');
const Counter = require('../models/Counter');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhoneDigits, isValidMobile10 } = require('../utils/phone');

const normalize = (value) => String(value || '').trim().toLowerCase();

const getNextQuotationNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'quotation' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return String(counter.seq);
};

const ensureProjectQuotationNumber = async (project) => {
  if (!project) return project;
  project.quotationDetails = project.quotationDetails || {};
  const current = String(project.quotationDetails.quoteNo || '').trim();
  if (current) return project;
  project.quotationDetails.quoteNo = await getNextQuotationNumber();
  await project.save();
  return project;
};

const ensureProjectCommentAccess = (req) => {
  const role = req.user?.role;
  const allowedRoles = ['FULL_ACCESS', 'TASK_EDITOR', 'EXECUTOR', 'PROJECT_READ_ONLY'];
  if (allowedRoles.includes(role)) {
    return true;
  }
  const err = new Error('You are not allowed to comment on projects.');
  err.status = 403;
  throw err;
};

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

const buildQuotationVersionsResponse = (project) => {
  const versions = Array.isArray(project?.quotationVersions) ? project.quotationVersions : [];
  const latestVersionId = versions.length ? String(versions[versions.length - 1]._id) : '';
  const hasCurrentPdf = Boolean(project?.quotations?.pdfData?.data?.length);
  return versions
    .slice()
    .sort((a, b) => {
      const aTime = a?.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bTime = b?.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .map((version) => ({
      id: version._id,
      generatedAt: version.generatedAt,
      pdfName: version.pdfName,
      // PDFs are stored only once on the current quotations record to avoid MongoDB 16MB limits.
      // For the latest version, treat the current PDF as available.
      pdfAvailable: Boolean(version.pdfData?.data?.length) || (hasCurrentPdf && String(version._id) === latestVersionId),
      fieldsCount: Array.isArray(version.entries) ? version.entries.length : 0,
    }));
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
    quotationVersions: buildQuotationVersionsResponse(project),
    id: plain._id,
  };
};

exports.listProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().populate('team');
  await Promise.all(projects.map((project) => ensureProjectQuotationNumber(project)));
  return res.json(projects.map(serializeProject));
});

exports.getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('team');
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  await ensureProjectQuotationNumber(project);
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
  await ensureProjectQuotationNumber(project);
  const hydrated = await buildProjectPayload(project);
  return res.status(201).json(serializeProject(hydrated));
});

exports.updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const touchingQuotationDetails =
    req.body.quotationDetails !== undefined || req.body.quotationDetailsFinalized !== undefined;

  if (req.body.name) project.name = req.body.name;
  if (req.body.description !== undefined) project.description = req.body.description;
  if (req.body.color) project.color = req.body.color;
  if (req.body.status) project.status = req.body.status;

  if (req.body.quotationDetails !== undefined) {
    const next = req.body.quotationDetails;
    if (next === null) {
      project.quotationDetails = undefined;
    } else if (typeof next === 'object') {
      project.quotationDetails = project.quotationDetails || {};
      // quoteNo is system-generated; ignore any client-provided value
      const allowedKeys = ['name', 'production', 'project', 'type', 'producer', 'contact'];

      if (next.contact !== undefined) {
        const normalized = normalizePhoneDigits(next.contact);
        if (!isValidMobile10(normalized)) {
          return res.status(400).json({ error: 'Contact must be a 10-digit mobile number.' });
        }
        project.quotationDetails.contact = normalized;
      }

      allowedKeys.forEach((key) => {
        if (next[key] !== undefined) {
          if (key === 'contact') return;
          project.quotationDetails[key] = next[key];
        }
      });
    }
  }

  if (req.body.quotationDetailsFinalized !== undefined) {
    project.quotationDetailsFinalized = Boolean(req.body.quotationDetailsFinalized);
  }

  if (touchingQuotationDetails) {
    await ensureProjectQuotationNumber(project);
  }

  if (touchingQuotationDetails && project.quotationDetailsFinalized) {
    const contact = project.quotationDetails?.contact;
    if (!isValidMobile10(contact)) {
      return res.status(400).json({ error: 'Contact must be a 10-digit mobile number.' });
    }
  }

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
  project.quotationVersions = Array.isArray(project.quotationVersions) ? project.quotationVersions : [];
  const nextVersionNumber = project.quotationVersions.length + 1;
  const baseName = `${String(project.key || 'PROJECT').toUpperCase()}-Quotations`;
  const versionedPdfName = nextVersionNumber === 1
    ? `${baseName}-Version.pdf`
    : `${baseName}-Version ${nextVersionNumber}.pdf`;
  project.quotations.pdfName = versionedPdfName;

  const nextVersion = {
    entries,
    generatedAt: project.quotations.generatedAt,
    pdfName: project.quotations.pdfName,
  };

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

  project.quotationVersions.push(nextVersion);

  await project.save();
  return res.json({
    ...buildQuotationsResponse(project),
    quotationVersions: buildQuotationVersionsResponse(project),
  });
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

exports.streamProjectQuotationVersionPdf = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const versionId = String(req.params.versionId || '');
  const versions = Array.isArray(project.quotationVersions) ? project.quotationVersions : [];
  const version = versions.find((item) => String(item._id) === versionId);

  if (!version) {
    return res.status(404).json({ error: 'Quotation version not found.' });
  }

  const latestVersionId = versions.length ? String(versions[versions.length - 1]._id) : '';
  const isLatest = latestVersionId && latestVersionId === versionId;

  const pdfBuffer = version.pdfData?.data || (isLatest ? project.quotations?.pdfData?.data : null);
  if (!pdfBuffer || !pdfBuffer.length) {
    return res.status(404).json({ error: 'Quotations PDF not found for this version.' });
  }

  const filename = version.pdfName || 'Quotations.pdf';
  res.setHeader('Content-Type', version.pdfData?.contentType || project.quotations?.pdfData?.contentType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  return res.send(pdfBuffer);
});

exports.addProjectComment = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('team');
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  ensureProjectCommentAccess(req);

  const text = String(req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  project.summaryComments = Array.isArray(project.summaryComments) ? project.summaryComments : [];
  project.summaryComments.push({
    text,
    author: {
      username: req.user?.username,
      name: req.user?.name,
      role: req.user?.role,
    },
    createdAt: new Date(),
  });

  await project.save();
  return res.json(serializeProject(project));
});

exports.deleteProjectComment = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('team');
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const commentId = String(req.params.commentId || '').trim();
  if (!commentId) {
    return res.status(400).json({ error: 'commentId is required.' });
  }

  const list = Array.isArray(project.summaryComments) ? project.summaryComments : [];
  const target = list.find((c) => String(c._id) === commentId);
  if (!target) {
    return res.status(404).json({ error: 'Comment not found.' });
  }

  const requesterUsername = normalize(req.user?.username);
  const authorUsername = normalize(target?.author?.username);
  const canDeleteAny = req.user?.role === 'FULL_ACCESS';
  const canDeleteOwn = requesterUsername && authorUsername && requesterUsername === authorUsername;

  if (!canDeleteAny && !canDeleteOwn) {
    const err = new Error('You are not allowed to delete this comment.');
    err.status = 403;
    throw err;
  }

  project.summaryComments = list.filter((c) => String(c._id) !== commentId);
  await project.save();
  return res.json(serializeProject(project));
});

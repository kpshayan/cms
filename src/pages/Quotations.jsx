import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Check, X, Trash2, FileText, ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { jsPDF } from 'jspdf';

const isBrowser = typeof window !== 'undefined';
const buildDraftStorageKey = (projectId) => `projectflow:quotations:draft:${projectId}`;

const readDraft = (projectId) => {
  if (!isBrowser || !projectId) return null;
  try {
    const raw = window.sessionStorage.getItem(buildDraftStorageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.responses)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeDraft = (projectId, payload) => {
  if (!isBrowser || !projectId) return;
  try {
    window.sessionStorage.setItem(buildDraftStorageKey(projectId), JSON.stringify(payload));
  } catch {
    // ignore quota / privacy mode errors
  }
};

const clearDraft = (projectId) => {
  if (!isBrowser || !projectId) return;
  try {
    window.sessionStorage.removeItem(buildDraftStorageKey(projectId));
  } catch {
    // ignore
  }
};

const FIELD_SEQUENCE = [
  { key: 'dataManagement', label: 'Data Management' },
  { key: 'edit', label: 'Edit' },
  { key: 'di', label: 'DI' },
  { key: 'dubbing', label: 'Dubbing' },
  { key: 'sfx', label: 'SFX' },
  { key: 'mixingMaster', label: 'Mixing and Master' },
  { key: 'posterDesign', label: 'Poster Design' },
  { key: 'lyricalVideos', label: 'Lyrical Videos' },
  { key: 'titleDesign', label: 'Title Design' },
  { key: 'titleAnimation', label: 'Title Animation' },
  { key: 'subtitles', label: 'Subtitles' },
  { key: 'censorScript', label: 'Censor Script' },
  { key: 'pitchDeck', label: 'Pitch Deck' },
  { key: 'mainRollingCredits', label: 'Main & Rolling Credits' },
  { key: 'trailerTeaserCredits', label: 'Trailer and Teaser Credits' },
];

const DETAILS_FIELDS = [
  { key: 'quoteNo', label: 'Quote No.' },
  { key: 'name', label: 'Name' },
  { key: 'production', label: 'Production' },
  { key: 'project', label: 'Project' },
  { key: 'type', label: 'Type' },
  { key: 'producer', label: 'Producer' },
  { key: 'contact', label: 'Contact' },
];

const FIELD_SEQUENCE_KEY_SET = new Set(FIELD_SEQUENCE.map((field) => field.key));
const FIELD_SEQUENCE_LABEL_MAP = new Map(FIELD_SEQUENCE.map((field) => [field.key, field.label]));

const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

const formatIndianNumber = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return '';
  const str = Math.round(n).toString();
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const withCommas = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return withCommas;
};

const numberToWordsIndian = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'Zero';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (x) => {
    const v = x % 100;
    if (v < 20) return ones[v];
    const t = Math.floor(v / 10);
    const o = v % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
  };

  const threeDigits = (x) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    const head = h ? `${ones[h]} Hundred` : '';
    const tail = r ? twoDigits(r) : '';
    return `${head}${head && tail ? ' ' : ''}${tail}`.trim();
  };

  let remaining = Math.floor(n);
  const parts = [];

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundredBlock = remaining;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundredBlock) parts.push(threeDigits(hundredBlock));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const formatIssuedOn = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[d.getMonth()] || '';
  const yyyy = d.getFullYear();
  return `${dd}${month}'${yyyy}`;
};

const fetchAsDataUrl = async (url) => {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Failed to read ${url}`));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
};

const sanitizeQuotationEntries = (entries) => {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .filter((entry) => entry && FIELD_SEQUENCE_KEY_SET.has(entry.key))
    .map((entry) => ({
      ...entry,
      label: FIELD_SEQUENCE_LABEL_MAP.get(entry.key) || entry.label,
      value: digitsOnly(entry.value),
      duration: typeof entry.duration === 'string' ? entry.duration : '',
    }));
};

const Quotations = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getProjectById, 
    saveQuotationsForProject,
    loadQuotationsForProject,
    getQuotationsForProject,
    updateProject,
  } = useData();
  const project = getProjectById(id);
  const projectId = project?._id || project?.id || id;
  const [selectedFieldKey, setSelectedFieldKey] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [currentDuration, setCurrentDuration] = useState('');
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingDuration, setEditingDuration] = useState('');
  const [editError, setEditError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFieldMenuOpen, setIsFieldMenuOpen] = useState(false);

  const [detailsDraft, setDetailsDraft] = useState({
    quoteNo: '',
    name: '',
    production: '',
    project: '',
    type: '',
    producer: '',
    contact: '',
  });
  const [isEditingDetails, setIsEditingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const nextFieldRef = useRef(null);
  const fieldMenuRef = useRef(null);
  const existingQuotations = getQuotationsForProject(projectId);

  const draftRestoredRef = useRef(false);

  const filledKeys = new Set((responses || []).map((entry) => entry?.key).filter(Boolean));
  const availableFields = FIELD_SEQUENCE.filter((field) => !filledKeys.has(field.key));
  const selectedField = availableFields.find((field) => field.key === selectedFieldKey) || null;

  useEffect(() => {
    if (!projectId) return;
    loadQuotationsForProject(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (draftRestoredRef.current) return;

    const draft = readDraft(projectId);
    if (!draft) {
      draftRestoredRef.current = true;
      return;
    }

    const draftResponses = Array.isArray(draft.responses) ? draft.responses : [];
    if (draftResponses.length) {
      setResponses(sanitizeQuotationEntries(draftResponses));
    }
    if (typeof draft.currentValue === 'string') {
      setCurrentValue(digitsOnly(draft.currentValue));
    }
    if (typeof draft.currentDuration === 'string') {
      setCurrentDuration(draft.currentDuration);
    }

    draftRestoredRef.current = true;
  }, [projectId]);

  useEffect(() => {
    if (!existingQuotations?.entries?.length) return;
    if (responses.length > 0) return;
    if (!draftRestoredRef.current) return;
    const draft = readDraft(projectId);
    if (draft?.responses?.length) return;
    setResponses(sanitizeQuotationEntries(existingQuotations.entries));
  }, [existingQuotations?.entries, responses.length, projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (!draftRestoredRef.current) return;

    const payload = {
      responses,
      selectedFieldKey,
      currentValue,
      currentDuration,
      savedAt: new Date().toISOString(),
    };
    writeDraft(projectId, payload);
  }, [projectId, responses, selectedFieldKey, currentValue, currentDuration]);

  useEffect(() => {
    if (!projectId) return;
    const initial = project?.quotationDetails || {};
    setDetailsDraft((prev) => ({
      ...prev,
      quoteNo: typeof initial.quoteNo === 'string' ? initial.quoteNo : prev.quoteNo,
      name: typeof initial.name === 'string' ? initial.name : prev.name,
      production: typeof initial.production === 'string' ? initial.production : prev.production,
      project: typeof initial.project === 'string' ? initial.project : prev.project,
      type: typeof initial.type === 'string' ? initial.type : prev.type,
      producer: typeof initial.producer === 'string' ? initial.producer : prev.producer,
      contact: typeof initial.contact === 'string' ? initial.contact : prev.contact,
    }));
    setIsEditingDetails(!project?.quotationDetailsFinalized);
  }, [projectId, project?.quotationDetailsFinalized, project?.quotationDetails]);

  useEffect(() => {
    if (!availableFields.length) {
      setSelectedFieldKey('');
      setIsFieldMenuOpen(false);
      return;
    }
    if (selectedFieldKey && !availableFields.some((field) => field.key === selectedFieldKey)) {
      setSelectedFieldKey('');
    }
  }, [availableFields, selectedFieldKey]);

  useEffect(() => {
    if (!isFieldMenuOpen) return;
    const handlePointerDown = (event) => {
      if (!fieldMenuRef.current) return;
      if (!fieldMenuRef.current.contains(event.target)) {
        setIsFieldMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFieldMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFieldMenuOpen]);

  const buildPdfBlob = async (entries) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const details = project?.quotationDetailsFinalized
      ? (project?.quotationDetails || detailsDraft)
      : detailsDraft;

    const quoteNo = String(details?.quoteNo || '').trim();
    const issuedOn = formatIssuedOn(new Date());

    // Load page templates (exact look comes from these background images)
    // You must place them in public/quotation-template/page1.png and page2.png
    let page1;
    let page2;
    try {
      page1 = await fetchAsDataUrl('/quotation-template/page1.png');
      page2 = await fetchAsDataUrl('/quotation-template/page2.png');
    } catch {
      // Fallback: still generate a basic PDF if template images are missing
      doc.setFontSize(18);
      doc.text('Quotation', 20, 20);
      doc.setFontSize(12);
      doc.text(`Issued On: ${issuedOn}`, 20, 30);
      doc.text(`Quote No: ${quoteNo || '-'}`, 20, 38);
      return doc.output('blob');
    }

    // Page 1 background
    doc.addImage(page1, 'PNG', 0, 0, 210, 297);

    // Overlay dynamic header values (coordinates tuned for A4 template)
    // Quote No (left side line)
    if (quoteNo) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(11);
      doc.text(quoteNo, 44, 70);
    }

    // Issued on (top-right)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    doc.text(issuedOn, 166, 63);

    // Issued to (right box)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    const rightX = 148;
    let rightY = 78;
    const rightLine = (label, value) => {
      const v = String(value || '').trim();
      doc.text(`${label}: ${v}`, rightX, rightY);
      rightY += 5.2;
    };
    rightLine('Name', details?.name);
    rightLine('Production', details?.production);
    rightLine('Project', details?.project);
    rightLine('Type', details?.type);
    rightLine('Producer', details?.producer);
    rightLine('Contact', details?.contact);

    // Table rows (Description | Duration | Amount)
    const rows = Array.isArray(entries) ? entries : [];
    const startY = 129;
    const rowH = 8;
    const descX = 24;
    const durX = 112;
    const amtX = 190;
    let y = startY;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);

    const amounts = rows.map((r) => Number(digitsOnly(r?.value))).filter((n) => Number.isFinite(n));
    const total = amounts.reduce((a, b) => a + b, 0);

    rows.slice(0, 6).forEach((entry) => {
      const desc = String(entry?.label || '').trim();
      const duration = String(entry?.duration || '').trim();
      const amt = digitsOnly(entry?.value);
      doc.text(desc, descX, y);
      doc.text(duration || '-', durX, y, { align: 'center' });
      doc.text(`${formatIndianNumber(amt)}/-`, amtX, y, { align: 'right' });
      y += rowH;
    });

    // Total row
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`${formatIndianNumber(total)}/-`, amtX, 176, { align: 'right' });

    // Total in words line
    const words = numberToWordsIndian(total);
    if (words) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`${words} Only`, 105, 186, { align: 'center' });
    }

    // Page 2 background (Terms)
    doc.addPage();
    doc.addImage(page2, 'PNG', 0, 0, 210, 297);

    return doc.output('blob');
  };

  const blobToBase64 = async (blob) => {
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const finalizeQuotations = async (entries) => {
    if (!projectId || isSaving) return;
    if (!project?.quotationDetailsFinalized) {
      setSubmitError('Please finalize the details box before generating the PDF.');
      return;
    }
    setIsSaving(true);
    setSubmitError('');
    try {
      const pdfBlob = await buildPdfBlob(entries);
      const quoteNo = String(project?.quotationDetails?.quoteNo || detailsDraft.quoteNo || '').trim();
      const baseName = quoteNo || (project?.key || 'PROJECT').toUpperCase();
      const pdfName = `${baseName}-Quotation.pdf`;
      const pdfBase64 = await blobToBase64(pdfBlob);
      await saveQuotationsForProject(projectId, {
        entries,
        generatedAt: new Date().toISOString(),
        pdfBlob,
        pdfName,
        pdfBase64,
      });

      clearDraft(projectId);
      navigate(`/dashboard/project/${id}/summary`);
    } catch (err) {
      setSubmitError(err?.message || 'Unable to save quotations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddField = () => {
    if (isSaving) return;
    if (!selectedField) {
      setError('Please select a field to add.');
      return;
    }

    const trimmedValue = digitsOnly(currentValue);
    if (!trimmedValue) {
      setError(`Please enter ${selectedField.label}.`);
      return;
    }

    const trimmedDuration = currentDuration.trim();

    const nextEntries = [...responses, { ...selectedField, value: trimmedValue, duration: trimmedDuration }];
    setResponses(nextEntries);
    setCurrentValue('');
    setCurrentDuration('');
    setSelectedFieldKey('');
    setError('');
    setSubmitError('');
  };

  const handleFinalizeDetails = async () => {
    if (!projectId || isSavingDetails) return;
    setDetailsError('');
    setSubmitError('');

    const quoteNo = String(detailsDraft.quoteNo || '').trim();
    if (!quoteNo) {
      setDetailsError('Quotation number is not generated yet. Please refresh and try again.');
      return;
    }

    const missing = DETAILS_FIELDS
      .filter((field) => field.key !== 'quoteNo')
      .filter((field) => !String(detailsDraft[field.key] || '').trim());
    if (missing.length) {
      setDetailsError('Please fill all details fields before finalizing.');
      return;
    }

    const contact = String(detailsDraft.contact || '').trim();
    if (!/^\d{10}$/.test(contact)) {
      setDetailsError('Contact must be a 10-digit mobile number.');
      return;
    }

    setIsSavingDetails(true);
    try {
      await updateProject(projectId, {
        quotationDetails: detailsDraft,
        quotationDetailsFinalized: true,
      });
      setIsEditingDetails(false);
    } catch (err) {
      setDetailsError(err?.message || 'Unable to save details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleEditDetails = async () => {
    if (!projectId || isSavingDetails) return;
    setDetailsError('');
    setSubmitError('');
    setIsSavingDetails(true);
    try {
      await updateProject(projectId, {
        quotationDetailsFinalized: false,
      });
      setIsEditingDetails(true);
    } catch (err) {
      setDetailsError(err?.message || 'Unable to enable editing.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddField();
    }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(digitsOnly(responses[index].value));
    setEditingDuration(responses[index].duration || '');
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
    setEditingDuration('');
    setEditError('');
  };

  const clearEditValue = () => {
    setEditingValue('');
    setEditingDuration('');
    setEditError('');
  };

  const deleteEntry = (index) => {
    setResponses((prev) => prev.filter((_, idx) => idx !== index));
    setError('');
    setSubmitError('');

    if (editingIndex === index) {
      cancelEdit();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex((prev) => (prev === null ? null : prev - 1));
    }
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const trimmed = digitsOnly(editingValue);
    if (!trimmed) {
      setEditError('Value cannot be empty.');
      return;
    }
    const nextDuration = String(editingDuration || '').trim();
    setResponses((prev) => prev.map((entry, idx) => (
      idx === editingIndex ? { ...entry, value: trimmed, duration: nextDuration } : entry
    )));
    cancelEdit();
  };

  if (!project) {
    return (
      <div className="p-8">
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-gray-200 dark:border-[var(--border-color)] p-8">
          <p className="text-center text-gray-600 dark:text-[var(--text-secondary)]">Project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-jira-bg/30 dark:bg-transparent min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-[var(--bg-surface)] border-2 border-jira-blue/15 dark:border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col gap-8">
            <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-jira-gray dark:text-white">Details</p>
                {isEditingDetails ? (
                  <button
                    type="button"
                    onClick={handleFinalizeDetails}
                    disabled={isSavingDetails}
                    className="w-9 h-9 rounded-full border-2 border-green-500 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Finalize"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditDetails}
                    disabled={isSavingDetails}
                    className="w-9 h-9 rounded-full border-2 border-jira-blue text-jira-blue flex items-center justify-center hover:bg-jira-blue hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {DETAILS_FIELDS.map((field) => (
                  <div key={field.key}>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{field.label}</p>
                    {isEditingDetails ? (
                      <input
                        value={detailsDraft[field.key]}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (field.key === 'quoteNo') {
                            return;
                          }
                          const next = field.key === 'contact'
                            ? raw.replace(/\D/g, '').slice(0, 10)
                            : raw;
                          setDetailsDraft((prev) => ({ ...prev, [field.key]: next }));
                        }}
                        type={field.key === 'contact' ? 'tel' : 'text'}
                        inputMode={field.key === 'contact' ? 'numeric' : undefined}
                        pattern={field.key === 'contact' ? '[0-9]*' : undefined}
                        maxLength={field.key === 'contact' ? 10 : undefined}
                        className="mt-1 w-full h-11 px-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                        placeholder={field.key === 'quoteNo' ? 'Auto generated' : (field.key === 'contact' ? 'Enter mobile number' : field.label)}
                        disabled={isSavingDetails || field.key === 'quoteNo'}
                      />
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-jira-gray dark:text-white break-words">
                        {String(project?.quotationDetails?.[field.key] || detailsDraft[field.key] || '').trim()}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {detailsError && <p className="mt-3 text-sm text-red-500">{detailsError}</p>}
            </div>

            {responses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {responses.map((entry, idx) => (
                  <div
                    key={entry.key}
                    className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide font-semibold text-jira-gray dark:text-white">
                          {entry.label}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {editingIndex === idx ? (
                          <>
                            <button
                              onClick={saveEdit}
                              className="w-8 h-8 rounded-full border-2 border-green-500 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={clearEditValue}
                              className="w-8 h-8 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                              title="Clear"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEntry(idx)}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 text-gray-700 flex items-center justify-center hover:bg-gray-800 hover:text-white hover:border-gray-800 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(idx)}
                            className="w-8 h-8 rounded-full border-2 border-jira-blue text-jira-blue flex items-center justify-center hover:bg-jira-blue hover:text-white transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      {editingIndex === idx ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setEditingValue(digitsOnly(raw));
                            }}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                            placeholder={`Update ${entry.label}`}
                          />
                          <input
                            type="text"
                            value={editingDuration}
                            onChange={(e) => setEditingDuration(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                            placeholder="Enter duration"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-jira-gray dark:text-white break-words">
                            {entry.value}
                          </p>
                          {String(entry.duration || '').trim() && (
                            <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">
                              Duration: {String(entry.duration).trim()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {editingIndex === idx && editError && (
                      <p className="mt-2 text-sm text-red-500">{editError}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div ref={nextFieldRef} className="py-6 relative">
              {availableFields.length > 0 ? (
                <>
                  <div className="mt-4 flex flex-col md:flex-row md:items-end gap-4">
                    <div className="relative w-full md:w-80 lg:w-96" ref={fieldMenuRef}>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setIsFieldMenuOpen((prev) => !prev)}
                        className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-lg focus:outline-none text-left flex items-center justify-between gap-3"
                        aria-haspopup="listbox"
                        aria-expanded={isFieldMenuOpen}
                      >
                        <span className="truncate text-jira-gray dark:text-white">{selectedField?.label || 'Select a service'}</span>
                        <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      </button>

                      {isFieldMenuOpen && (
                        <div
                          role="listbox"
                          tabIndex={-1}
                          className="absolute left-0 right-0 mt-1.5 z-50 rounded-xl border border-gray-200 dark:border-[var(--border-color)] shadow-lg overflow-hidden bg-white/90 dark:bg-[var(--bg-surface)] backdrop-blur-md"
                        >
                          <div className="max-h-56 overflow-y-auto p-1.5">
                            {availableFields.map((field) => (
                              <button
                                key={field.key}
                                type="button"
                                role="option"
                                aria-selected={field.key === selectedFieldKey}
                                onClick={() => {
                                  setSelectedFieldKey(field.key);
                                  setCurrentValue('');
                                  setError('');
                                  setIsFieldMenuOpen(false);
                                }}
                                className={
                                  `w-full text-left px-3 py-2.5 rounded-lg transition text-base ` +
                                  (field.key === selectedFieldKey
                                    ? 'bg-jira-bg/40 dark:bg-white/10 font-semibold text-jira-gray dark:text-white'
                                    : 'text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/5')
                                }
                              >
                                {field.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-72 lg:w-80">
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setCurrentValue(digitsOnly(raw));
                        }}
                        onKeyDown={handleKeyPress}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-lg focus:outline-none"
                        placeholder="₹ 00000"
                        disabled={isSaving}
                      />
                    </div>

                    <div className="w-full md:w-64 lg:w-72">
                      <input
                        type="text"
                        value={currentDuration}
                        onChange={(e) => setCurrentDuration(e.target.value)}
                        className="w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-lg focus:outline-none"
                        placeholder="Enter duration"
                        disabled={isSaving}
                      />
                    </div>

                    <button
                      onClick={handleAddField}
                      disabled={isSaving}
                      className="w-full md:w-44 h-14 inline-flex items-center justify-center gap-2 px-6 rounded-full border-2 border-jira-blue text-jira-blue font-semibold hover:bg-jira-blue hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Add field"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5">
                  <p className="text-sm text-gray-600 dark:text-[var(--text-secondary)]">All 19 fields are already added. You can still edit values above.</p>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
              {submitError && <p className="mt-2 text-sm text-red-500">{submitError}</p>}
            </div>

            <div className="py-8 text-center">
              <h2 className="text-2xl font-bold text-jira-gray dark:text-white">Generate PDF</h2>
              <p className="mt-2 text-sm text-gray-500">Generate or regenerate the PDF after adding or editing values.</p>
              <button
                onClick={() => finalizeQuotations(responses)}
                disabled={isSaving || !responses.length}
                className="mt-4 inline-flex items-center space-x-2 bg-jira-blue text-white px-5 py-3 rounded-full font-semibold shadow hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                <span>{isSaving ? 'Generating...' : 'Generate PDF'}</span>
              </button>
              {submitError && <p className="mt-3 text-sm text-red-500">{submitError}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotations;

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
  // Matches the template style: 15'January'2026
  return `${dd}'${month}'${yyyy}`;
};

const formatQuoteNo = (raw) => {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  // If backend stores a plain sequence number, render as MSBQYY### (example: MSBQ26001)
  if (/^\d+$/.test(clean)) {
    const yy = String(new Date().getFullYear()).slice(-2);
    return `MSBQ${yy}${clean.padStart(3, '0')}`;
  }
  return clean;
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

const estimateDataUrlBytes = (dataUrl) => {
  const str = String(dataUrl || '');
  const comma = str.indexOf(',');
  if (comma === -1) return 0;
  const base64Len = str.length - comma - 1;
  return Math.floor((base64Len * 3) / 4);
};

const compressImageDataUrlToJpeg = async (dataUrl, {
  maxWidth = 2480, // ~A4 portrait @ 300 DPI width
  maxHeight = 3508, // ~A4 portrait @ 300 DPI height
  quality = 0.88,
} = {}) => {
  const input = String(dataUrl || '');
  if (!input.startsWith('data:image/')) return input;
  if (typeof document === 'undefined') return input;

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode image'));
      el.src = input;
    });

    const srcW = Number(img.width) || 0;
    const srcH = Number(img.height) || 0;
    if (!srcW || !srcH) return input;

    // Downscale only (never upscale).
    const scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1);
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return input;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, dstW, dstH);

    // Force JPEG for much smaller PDFs.
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return input;
  }
};

const compressTemplateForPdf = async (dataUrl) => {
  const original = String(dataUrl || '');
  if (!original.startsWith('data:image/')) return original;

  // Aim for smaller embedded backgrounds so storing the PDF in MongoDB stays under 16MB.
  // Target per-page background size ~1.8MB (2 pages => ~3–4MB PDF typically).
  const targetBytes = 1_800_000;

  const presets = [
    { maxWidth: 2480, maxHeight: 3508, quality: 0.9 },
    { maxWidth: 2200, maxHeight: 3115, quality: 0.86 },
    { maxWidth: 2000, maxHeight: 2830, quality: 0.82 },
    { maxWidth: 1700, maxHeight: 2400, quality: 0.8 },
  ];

  let current = original;
  for (const preset of presets) {
    // eslint-disable-next-line no-await-in-loop
    current = await compressImageDataUrlToJpeg(current, preset);
    if (estimateDataUrlBytes(current) <= targetBytes) break;
  }

  return current;
};

const fetchFirstAvailableAsDataUrl = async (urls) => {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  let lastError;
  for (const url of list) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fetchAsDataUrl(url);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No template URLs provided');
};

const drawQuotationTemplate = async ({ doc, issuedOn, quoteNo, details, rows, total, totalWords }) => {
  const navy = [7, 25, 49];
  const gold = [214, 155, 60];
  const gray = [110, 110, 110];
  const lightGray = [150, 150, 150];
  const orange = [244, 179, 81];
  const pageW = 210;

  let templatePage1;
  let templatePage2;
  try {
    templatePage1 = await fetchFirstAvailableAsDataUrl([
      // Preferred template (new)
      '/quotation-template/Mayasabha%20studios%20invoice%20template_page-0001.jpg',
      '/quotation-template/Mayasabha studios invoice template_page-0001.jpg',
      '/quotation-template/page1.png',
      '/quotation-template/page1.jpg',
      '/quotation-template/page1.jpeg',
      '/quotation-template/page1.png.jpg',
      '/quotation-template/page1.PNG',
      '/quotation-template/page1.JPG',
      '/quotation-template/page1.JPEG',
      '/quotation-template/pag1.png',
      '/quotation-template/pag1.jpg',
      '/quotation-template/pag1.jpeg',
      '/quotation-template/pag1.PNG',
      '/quotation-template/pag1.JPG',
      '/quotation-template/pag1.JPEG',
    ]);
  } catch {
    templatePage1 = null;
  }

  try {
    templatePage2 = await fetchFirstAvailableAsDataUrl([
      '/quotation-template/page2.png',
      '/quotation-template/page2.jpg',
      '/quotation-template/page2.jpeg',
      '/quotation-template/page2.png.jpg',
      '/quotation-template/page2.PNG',
      '/quotation-template/page2.JPG',
      '/quotation-template/page2.JPEG',
      '/quotation-template/pag2.png',
      '/quotation-template/pag2.jpg',
      '/quotation-template/pag2.jpeg',
      '/quotation-template/pag2.PNG',
      '/quotation-template/pag2.JPG',
      '/quotation-template/pag2.JPEG',
    ]);
  } catch {
    templatePage2 = null;
  }

  // Reduce PDF size by downscaling and JPEG-compressing background templates.
  // Goal: keep final 2-page PDF around ~3–4 MB without visible quality loss.
  if (templatePage1) {
    // eslint-disable-next-line no-await-in-loop
    templatePage1 = await compressTemplateForPdf(templatePage1);
  }
  if (templatePage2) {
    // eslint-disable-next-line no-await-in-loop
    templatePage2 = await compressTemplateForPdf(templatePage2);
  }

  const hasTemplateBackground = Boolean(templatePage1);

  const addTemplateBackground = (pageIndex) => {
    if (!hasTemplateBackground) return;
    const bg = pageIndex === 0 ? templatePage1 : (templatePage2 || templatePage1);
    if (!bg) return;
    const fmt = bg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(bg, fmt, 0, 0, pageW, 297);
  };

  const tableX = 12;
  const tableW = 186;
  const headerY = 122;
  const headerH = 10;
  const bodyStartY = headerY + headerH + 8;
  const pageBottomY = 286;
  const lastPageFooterReserve = 86; // total + words + terms + padding

  const maxDescW = 72;
  const maxDurW = 78;

  const getRowLayout = (entry, { lineH = 4.4, minRowH = 10 } = {}) => {
    const desc = String(entry?.label || '').trim() || '-';
    const duration = String(entry?.duration || '').trim() || '-';
    const amount = digitsOnly(entry?.value);
    const descLines = doc.splitTextToSize(desc, maxDescW);
    const durLines = doc.splitTextToSize(duration, maxDurW);
    const lineCount = Math.max(descLines.length, durLines.length);
    const rowH = Math.max(minRowH, lineCount * lineH);
    return { descLines, durLines, amount, rowH };
  };

  const drawPageHeader = async ({ mode = 'content' } = {}) => {
    // Page 1 only: draw background + overlays.
    addTemplateBackground(0);

    // Page-2 requirement: template-only page must not contain any dynamic overlays.
    if (mode === 'templateOnly') return;

    // Logo (optional): always overlay on top of the template/background.
    try {
      const logoData = await fetchFirstAvailableAsDataUrl([
        '/quotation-template/logo.png',
        '/quotation-template/logo.jpg',
        '/quotation-template/logo.jpeg',
        '/quotation-template/logo.PNG',
        '/quotation-template/logo.JPG',
        '/quotation-template/logo.JPEG',
          '/quotation-template/logo.PNG',
          '/quotation-template/logo.JPG',
          '/quotation-template/logo.JPEG',
      ]);
      const fmt = logoData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoData, fmt, 14, 8, 22, 22);
    } catch {
      // ok
    }

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(34);
    doc.text('Quotation', 14, 66);

    // Quote number
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(12);
    doc.text(`Quote No. ${quoteNo || '-'}`, 16, 76);

    // Left company details (styled like reference template)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...lightGray);
    doc.setFontSize(11);
    const leftX = 16;
    let leftY = 84;
    const leftLine = (text) => {
      doc.text(text, leftX, leftY);
      leftY += 6;
    };
    leftLine('P: +91 96666 38 123');
    leftLine('E: info@mayasabhastudios.com');
    leftLine('A: Flat No. 1-62/5/203-303, Kavuri Supreme Enclave,');
    leftLine('   Kavuri Hills, Hyderabad 500033');
    leftLine('GST No: 36AACCM7226P1Z0');

    // Right block: ISSUED ON + ISSUED TO
    const blockX = 118;
    const blockY = 60;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.setFontSize(11);
    doc.text('ISSUED ON:', blockX, blockY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(issuedOn, blockX + 38, blockY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...gray);
    doc.text('ISSUED TO', blockX, blockY + 10);

    const labelX = blockX;
    const valueX = blockX + 32;
    let y = blockY + 18;
    const line = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text(`${label}:`, labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(String(value || '-'), valueX, y);
      y += 6;
    };
    line('Name', details?.name);
    line('Production', details?.production);
    line('Project', details?.project);
    line('Type', details?.type);
    line('Producer', details?.producer);
    line('Contact', details?.contact);

    // Table header (match reference spacing + align with columns)
    doc.setFillColor(...orange);
    doc.rect(tableX, headerY, tableW, headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10.5);
    const headerTextY = headerY + 8;
    doc.text('Description', tableX + 55, headerTextY, { align: 'center' });
    doc.text('Duration', tableX + 112, headerTextY, { align: 'center' });
    // Built-in jsPDF fonts often miss the ₹ glyph; use a reliable label.
    doc.text('Amount (Rs.)', tableX + 170, headerTextY, { align: 'center' });

    // Intentionally no page numbers: the output is a fixed 2-page PDF.
  };

  const drawFooter = (startY) => {
    const totalY = startY;
    const totalH = 12;
    const wordsH = 10;

    // Total band + words band (match reference styling)
    doc.setFillColor(...orange);
    doc.rect(tableX, totalY, tableW, totalH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(12);
    doc.text('Total', tableX + 105, totalY + 8, { align: 'center' });
    doc.text(`${formatIndianNumber(total)}/-`, tableX + 170, totalY + 8, { align: 'center' });

    const wordsY = totalY + totalH;
    doc.setFillColor(...orange);
    doc.rect(tableX, wordsY, tableW, wordsH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(11);
    doc.text(`${(totalWords || '').trim()} Only`.trim(), tableX + 105, wordsY + 8, { align: 'center' });

    const termsY = (hasTemplateBackground ? (startY + 12 + 10 + 18) : (startY + 12 + 10 + 18));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(12);
    doc.text('Terms & Conditions', 16, termsY);
    doc.setDrawColor(160, 160, 160);
    doc.line(16, termsY + 1.5, 65, termsY + 1.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10.5);
    const bullets = [
      'This quote is only for preliminary understanding, acceptance, and locking of the project. The Contract will contain all details.',
      'The info mentioned in this quote is confidential and only applicable to this project and hence not to share with anyone else.',
      'The above quote is valid for 30 days from the date of issue.',
    ];
    let by = termsY + 10;
    bullets.forEach((text) => {
      const lines = doc.splitTextToSize(text, 180);
      doc.text('•', 18, by);
      doc.text(lines, 22, by);
      by += lines.length * 5.2 + 2;
    });
  };

  // Prepare row layouts up-front.
  // IMPORTANT: all rows must remain on page 1 (do not paginate onto page 2).
  const safeRows = Array.isArray(rows) ? rows : [];
  const bodyAvailableH = (pageBottomY - lastPageFooterReserve) - bodyStartY;

  let fontSize = 10;
  let lineH = 4.4;
  let minRowH = 10;
  let layouts = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    layouts = safeRows.map((entry) => ({ entry, layout: getRowLayout(entry, { lineH, minRowH }) }));
    const requiredH = layouts.reduce((sum, item) => sum + (item?.layout?.rowH || 0), 0);
    if (requiredH <= bodyAvailableH) break;

    // Shrink until it fits, keeping everything on page 1.
    fontSize = Math.max(7, fontSize - 1);
    lineH = Math.max(3.2, lineH - 0.3);
    minRowH = Math.max(7, minRowH - 1);
  }

  await drawPageHeader({ mode: 'content' });

  const descX = tableX + 18;
  const durX = tableX + 112;
  const amtX = tableX + 170;
  const rowIndexX = tableX + 8;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(fontSize);

  let y = bodyStartY;
  for (let i = 0; i < layouts.length; i += 1) {
    const { layout } = layouts[i];
    const rowTextY = y + 4;
    doc.text(String(i + 1), rowIndexX, rowTextY);
    doc.text(layout.descLines, descX, rowTextY);
    doc.text(layout.durLines, durX, rowTextY, { align: 'center' });
    doc.text(`${formatIndianNumber(layout.amount)}/-`, amtX, rowTextY, { align: 'center' });

    y += layout.rowH;
  }

  // Footer (totals + terms) must always be on page 1.
  const footerStartY = Math.max(y + 6, 150);
  drawFooter(footerStartY);

  // Page 2 must be template-only, matching `page2.png.jpg` exactly (no overlays).
  doc.addPage();
  if (templatePage2 || templatePage1) {
    const bg = templatePage2 || templatePage1;
    const fmt = bg.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(bg, fmt, 0, 0, pageW, 297);
  }
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

  const detailsBoxRef = useRef(null);
  const fieldMenuPopupRef = useRef(null);
  const detailsAttentionTimeoutRef = useRef(null);
  const [detailsNeedsAttention, setDetailsNeedsAttention] = useState(false);

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

  useEffect(() => {
    return () => {
      if (detailsAttentionTimeoutRef.current) {
        clearTimeout(detailsAttentionTimeoutRef.current);
      }
    };
  }, []);

  const scrollIntoViewIfNeeded = (node, { padding = 24, behavior = 'smooth' } = {}) => {
    if (!node) return;
    const getScrollParent = (el) => {
      let current = el?.parentElement;
      while (current) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
        if (isScrollable) return current;
        current = current.parentElement;
      }
      return null;
    };

    const scrollParent = getScrollParent(node);

    if (!scrollParent) {
      const rect = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const topOverflow = rect.top - padding;
      const bottomOverflow = rect.bottom + padding - viewportHeight;

      if (topOverflow < 0) {
        window.scrollBy({ top: topOverflow, behavior });
        return;
      }
      if (bottomOverflow > 0) {
        window.scrollBy({ top: bottomOverflow, behavior });
      }
      return;
    }

    const parentRect = scrollParent.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const visibleTop = parentRect.top + padding;
    const visibleBottom = parentRect.bottom - padding;

    if (rect.top < visibleTop) {
      const delta = rect.top - visibleTop;
      scrollParent.scrollTo({ top: scrollParent.scrollTop + delta, behavior });
      return;
    }

    if (rect.bottom > visibleBottom) {
      const delta = rect.bottom - visibleBottom;
      scrollParent.scrollTo({ top: scrollParent.scrollTop + delta, behavior });
    }
  };

  const ensureServiceRowVisible = () => {
    if (!nextFieldRef.current) return;
    scrollIntoViewIfNeeded(nextFieldRef.current);
  };

  const ensureDropdownVisible = () => {
    if (!fieldMenuPopupRef.current) return;
    scrollIntoViewIfNeeded(fieldMenuPopupRef.current);
  };

  useEffect(() => {
    if (!isFieldMenuOpen) return;
    const raf = requestAnimationFrame(() => {
      ensureServiceRowVisible();
      ensureDropdownVisible();
    });
    return () => cancelAnimationFrame(raf);
  }, [isFieldMenuOpen]);

  const buildPdfBlob = async (entries) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    const details = project?.quotationDetailsFinalized
      ? (project?.quotationDetails || detailsDraft)
      : detailsDraft;

    const quoteNo = formatQuoteNo(details?.quoteNo);
    const issuedOn = formatIssuedOn(new Date());

    const safeRows = Array.isArray(entries) ? entries : [];
    const amounts = safeRows
      .map((r) => Number(digitsOnly(r?.value)))
      .filter((n) => Number.isFinite(n));
    const total = amounts.reduce((a, b) => a + b, 0);
    const words = numberToWordsIndian(total);

    await drawQuotationTemplate({
      doc,
      issuedOn,
      quoteNo,
      details,
      rows: safeRows,
      total,
      totalWords: words,
    });

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
      const message = 'Please finalize the details box before generating the PDF.';
      setSubmitError('');
      setDetailsError(message);

      setDetailsNeedsAttention(true);
      if (detailsAttentionTimeoutRef.current) {
        clearTimeout(detailsAttentionTimeoutRef.current);
      }
      detailsAttentionTimeoutRef.current = setTimeout(() => {
        setDetailsNeedsAttention(false);
      }, 2200);

      requestAnimationFrame(() => {
        if (detailsBoxRef.current) {
          detailsBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      return;
    }
    setIsSaving(true);
    setSubmitError('');
    try {
      const pdfBlob = await buildPdfBlob(entries);
      const quoteNo = formatQuoteNo(project?.quotationDetails?.quoteNo || detailsDraft.quoteNo || '');
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
      navigate(`/dashboard/project/${id}/summary`, {
        state: { scrollTo: 'quotationsSnapshot' },
      });
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
            <div
              ref={detailsBoxRef}
              className={
                'rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 p-4 transition ' +
                (detailsNeedsAttention ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-white dark:ring-offset-[var(--bg-surface)]' : '')
              }
            >
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
                        onClick={() => {
                          setIsFieldMenuOpen((prev) => !prev);
                          ensureServiceRowVisible();
                        }}
                        onFocus={ensureServiceRowVisible}
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
                          ref={fieldMenuPopupRef}
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
                          ensureServiceRowVisible();
                        }}
                        onKeyDown={handleKeyPress}
                        onFocus={ensureServiceRowVisible}
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
                        onChange={(e) => {
                          setCurrentDuration(e.target.value);
                          ensureServiceRowVisible();
                        }}
                        onFocus={ensureServiceRowVisible}
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

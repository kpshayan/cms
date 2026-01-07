import { useState, useRef, useEffect } from 'react';
import { ClipboardList, Plus, Pencil, Check, X, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { jsPDF } from 'jspdf';

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
  { key: 'number', label: 'Number', type: 'number' },
  { key: 'owner', label: 'Owner' },
  { key: 'producer', label: 'Producer' },
  { key: 'productionHouse', label: 'Production House' },
];

const Quotations = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getProjectById, 
    saveQuotationsForProject,
    loadQuotationsForProject,
    getQuotationsForProject,
  } = useData();
  const project = getProjectById(id);
  const projectId = project?._id || project?.id || id;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState('');
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editError, setEditError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const nextFieldRef = useRef(null);

  const currentField = FIELD_SEQUENCE[currentIndex];
  const isLastField = currentIndex === FIELD_SEQUENCE.length - 1;
  const existingQuotations = getQuotationsForProject(projectId);

  useEffect(() => {
    if (!projectId) return;
    loadQuotationsForProject(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!existingQuotations?.entries?.length) return;
    if (responses.length > 0) return;
    setResponses(existingQuotations.entries);
    setCurrentIndex(Math.min(existingQuotations.entries.length, FIELD_SEQUENCE.length));
  }, [existingQuotations?.entries, responses.length]);

  const buildPdfBlob = (entries) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Project Quotations', 20, 20);
    doc.setFontSize(12);
    if (project?.name) {
      doc.text(`Project: ${project.name}`, 20, 30);
    }
    let y = 44;
    entries.forEach((entry, idx) => {
      const lines = doc.splitTextToSize(`${entry.label}: ${entry.value}`, 170);
      doc.text(lines, 20, y);
      y += lines.length * 8;
      if (y > 270 && idx !== entries.length - 1) {
        doc.addPage();
        y = 20;
      }
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
    setIsSaving(true);
    setSubmitError('');
    try {
      const pdfBlob = buildPdfBlob(entries);
      const pdfName = `${(project?.key || 'PROJECT').toUpperCase()}-Quotations.pdf`;
      const pdfBase64 = await blobToBase64(pdfBlob);
      await saveQuotationsForProject(projectId, {
        entries,
        generatedAt: new Date().toISOString(),
        pdfBlob,
        pdfName,
        pdfBase64,
      });
      navigate(`/dashboard/project/${id}/summary`);
    } catch (err) {
      setSubmitError(err?.message || 'Unable to save quotations.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!currentField) return;
    if (isSaving) return;
    const trimmedValue = currentField.type === 'number' ? currentValue : currentValue.trim();
    if (!trimmedValue) {
      setError(`Please fill ${currentField.label} before continuing.`);
      return;
    }

    const nextEntries = [...responses, { ...currentField, value: trimmedValue }];
    setResponses(nextEntries);
    setCurrentValue('');
    setCurrentIndex((prev) => prev + 1);
    setError('');
    setSubmitError('');
    if (isLastField) {
      await finalizeQuotations(nextEntries);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAdvance();
    }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(responses[index].value);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
    setEditError('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const target = responses[editingIndex];
    const trimmed = target.type === 'number' ? editingValue : editingValue.trim();
    if (!trimmed) {
      setEditError('Value cannot be empty.');
      return;
    }
    setResponses((prev) => prev.map((entry, idx) => (
      idx === editingIndex ? { ...entry, value: trimmed } : entry
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

  const completedAll = !currentField;

  useEffect(() => {
    if (!completedAll && nextFieldRef.current) {
      nextFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [responses.length, completedAll]);

  return (
    <div className="p-8 bg-jira-bg/30 dark:bg-transparent min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-lg border border-gray-200 dark:border-[var(--border-color)] p-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-jira-blue to-jira-blue-light flex items-center justify-center text-white shadow-xl">
              <ClipboardList className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">{project.key} • Quotations</p>
              <h1 className="text-3xl font-bold text-jira-gray dark:text-white">{project.name}</h1>
              <p className="text-sm text-gray-500">Sequential capture for pricing and creative deliverables</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[var(--bg-surface)] border-2 border-jira-blue/15 dark:border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/10">
            {responses.map((entry, idx) => (
              <div key={entry.key} className="py-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{entry.label}</p>
                    {editingIndex === idx ? (
                      <input
                        type={entry.type || 'text'}
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="mt-2 w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                        placeholder={`Update ${entry.label}`}
                      />
                    ) : (
                      <p className="text-xl font-semibold text-jira-gray dark:text-white mt-1 break-words">{entry.value}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {editingIndex === idx ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="w-12 h-12 rounded-full border-2 border-green-500 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition"
                          title="Save"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-12 h-12 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(idx)}
                        className="w-12 h-12 rounded-full border-2 border-jira-blue text-jira-blue flex items-center justify-center hover:bg-jira-blue hover:text-white transition"
                        title="Edit"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                {editingIndex === idx && editError && (
                  <p className="text-sm text-red-500">{editError}</p>
                )}
              </div>
            ))}

            {!completedAll && (
              <div ref={nextFieldRef} className="py-6 relative">
                <p className="text-xs uppercase tracking-wide text-gray-500">Next Field</p>
                <h2 className="text-3xl font-bold text-jira-gray dark:text-white mt-1">{currentField.label}</h2>
                <div className="mt-4 flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pr-2">
                  <input
                    type={currentField.type || 'text'}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 bg-transparent border-none py-4 px-5 text-lg focus:outline-none"
                    placeholder={`Enter ${currentField.label}`}
                    disabled={isSaving}
                  />
                  <button
                    onClick={handleAdvance}
                    disabled={isSaving}
                    className="w-14 h-14 rounded-full border-2 border-jira-blue text-jira-blue flex items-center justify-center hover:bg-jira-blue hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                    title={isLastField ? 'Generate PDF' : 'Save and continue'}
                  >
                    {isLastField ? <FileText className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  </button>
                </div>
                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
                {submitError && <p className="mt-2 text-sm text-red-500">{submitError}</p>}
              </div>
            )}

            {completedAll && (
              <div className="py-8 text-center">
                <h2 className="text-2xl font-bold text-jira-gray dark:text-white">All fields captured</h2>
                <p className="mt-2 text-sm text-gray-500">Regenerate the PDF if you've updated any values.</p>
                <button
                  onClick={() => finalizeQuotations(responses)}
                  disabled={isSaving || !responses.length}
                  className="mt-4 inline-flex items-center space-x-2 bg-jira-blue text-white px-5 py-3 rounded-full font-semibold shadow hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isSaving ? 'Generating...' : 'Regenerate PDF'}</span>
                </button>
                {submitError && <p className="mt-3 text-sm text-red-500">{submitError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotations;

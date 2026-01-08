import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Check, X, FileText, ChevronDown } from 'lucide-react';
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
  const [selectedFieldKey, setSelectedFieldKey] = useState(FIELD_SEQUENCE[0]?.key || '');
  const [currentValue, setCurrentValue] = useState('');
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editError, setEditError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFieldMenuOpen, setIsFieldMenuOpen] = useState(false);
  const nextFieldRef = useRef(null);
  const fieldMenuRef = useRef(null);
  const existingQuotations = getQuotationsForProject(projectId);

  const draftRestoredRef = useRef(false);

  const filledKeys = new Set((responses || []).map((entry) => entry?.key).filter(Boolean));
  const availableFields = FIELD_SEQUENCE.filter((field) => !filledKeys.has(field.key));
  const selectedField = availableFields.find((field) => field.key === selectedFieldKey) || availableFields[0];

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
      setResponses(draftResponses);
    }
    if (typeof draft.selectedFieldKey === 'string') {
      setSelectedFieldKey(draft.selectedFieldKey);
    }
    if (typeof draft.currentValue === 'string') {
      setCurrentValue(draft.currentValue);
    }

    draftRestoredRef.current = true;
  }, [projectId]);

  useEffect(() => {
    if (!existingQuotations?.entries?.length) return;
    if (responses.length > 0) return;
    if (!draftRestoredRef.current) return;
    const draft = readDraft(projectId);
    if (draft?.responses?.length) return;
    setResponses(existingQuotations.entries);
  }, [existingQuotations?.entries, responses.length, projectId]);

  useEffect(() => {
    if (!projectId) return;
    if (!draftRestoredRef.current) return;

    const payload = {
      responses,
      selectedFieldKey,
      currentValue,
      savedAt: new Date().toISOString(),
    };
    writeDraft(projectId, payload);
  }, [projectId, responses, selectedFieldKey, currentValue]);

  useEffect(() => {
    if (!availableFields.length) {
      setSelectedFieldKey('');
      setIsFieldMenuOpen(false);
      return;
    }
    if (!selectedFieldKey || !availableFields.some((field) => field.key === selectedFieldKey)) {
      setSelectedFieldKey(availableFields[0].key);
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

    const trimmedValue = selectedField.type === 'number' ? currentValue : currentValue.trim();
    if (!trimmedValue) {
      setError(`Please enter ${selectedField.label}.`);
      return;
    }

    const nextEntries = [...responses, { ...selectedField, value: trimmedValue }];
    setResponses(nextEntries);
    setCurrentValue('');
    setError('');
    setSubmitError('');
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddField();
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

  useEffect(() => {
    if (!project) return;
    if (nextFieldRef.current) {
      nextFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [project, responses.length]);

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
            {responses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {responses.map((entry, idx) => (
                  <div
                    key={entry.key}
                    className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 p-5"
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
                              className="w-11 h-11 rounded-full border-2 border-green-500 text-green-600 flex items-center justify-center hover:bg-green-500 hover:text-white transition"
                              title="Save"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="w-11 h-11 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(idx)}
                            className="w-11 h-11 rounded-full border-2 border-jira-blue text-jira-blue flex items-center justify-center hover:bg-jira-blue hover:text-white transition"
                            title="Edit"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {editingIndex === idx ? (
                        <input
                          type={entry.type || 'text'}
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-base focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                          placeholder={`Update ${entry.label}`}
                        />
                      ) : (
                        <p className="text-lg font-semibold text-jira-gray dark:text-white break-words">
                          {entry.value}
                        </p>
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
              <p className="text-xs uppercase tracking-wide text-gray-500">Add Field</p>

              {availableFields.length > 0 ? (
                <>
                  <div className="mt-4 flex flex-col md:flex-row md:items-end gap-4">
                    <div className="relative" ref={fieldMenuRef}>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Select Field</p>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => setIsFieldMenuOpen((prev) => !prev)}
                        className="mt-2 w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-lg focus:outline-none text-left flex items-center justify-between gap-3"
                        aria-haspopup="listbox"
                        aria-expanded={isFieldMenuOpen}
                      >
                        <span className="truncate text-jira-gray dark:text-white">{selectedField?.label || 'Select a field'}</span>
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

                    <div className="md:flex-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Value</p>
                      <input
                        type={selectedField?.type || 'text'}
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="mt-2 w-full h-14 px-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-lg focus:outline-none"
                        placeholder={selectedField ? `Enter ${selectedField.label}` : 'Enter value'}
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

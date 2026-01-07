import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Tag, User, Paperclip, Inbox, Edit2, Upload, Search, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const chipClass = {
  status: {
    'todo': 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/5 dark:text-[var(--text-secondary)] dark:border-white/10',
    'in-progress': 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/40',
    'hold': 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/40',
    'done': 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/40'
  },
  priority: {
    'low': 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/5 dark:text-[var(--text-secondary)] dark:border-white/10',
    'medium': 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/40',
    'high': 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/40'
  }
};

const TaskDetails = () => {
  const navigate = useNavigate();
  const { id: projectId, taskId } = useParams();
    const { getProjectById, getTaskById, updateTask } = useData();
    const { hasPermission, user, executors } = useAuth();

  const project = getProjectById(projectId);
  const task = getTaskById(taskId);
  const canManageTasks = hasPermission('manageTasks');
  const canManageOwnTasks = Boolean(user?.permissions?.manageOwnTasks);
  const canViewTasks = hasPermission('viewTasks');

  const normalizeIdentifier = (value) => String(value ?? '').trim().toLowerCase();
  const userIdentifiers = [
    user?.username,
    user?.email,
    user?._id,
    user?.id,
  ].map(normalizeIdentifier).filter(Boolean);
  const assigneeIdentifiers = [
    task?.assignee?.username,
    task?.assignee?.email,
    task?.assignee?._id,
    task?.assignee?.id,
  ].map(normalizeIdentifier).filter(Boolean);
  const isTaskOwnedByCurrentUser = userIdentifiers.some((identifier) => assigneeIdentifiers.includes(identifier));

  const canEditTask = canManageTasks || (canManageOwnTasks && isTaskOwnedByCurrentUser);
  const canViewDetails = canManageTasks || canManageOwnTasks || canViewTasks;

  if (!canViewDetails) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-jira-blue mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-[var(--text-secondary)] border border-gray-100 dark:border-[var(--border-color)]">
          You do not have permission to view task details.
        </div>
      </div>
    );
  }

  if (!project || !task) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-jira-blue mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-[var(--text-secondary)] border border-gray-100 dark:border-[var(--border-color)]">
          Task not found.
        </div>
      </div>
    );
  }

  const attachments = task.attachments || [];
  const assignee = task.assignee;
  const assigneeAvatar = assignee?.avatar || assignee?.name?.charAt(0) || '?';
  const assigneeDisplayName = assignee?.name || assignee?.username || 'Unassigned';
  const assigneeEmail = assignee?.email || (assignee?.username ? `${assignee.username}@projectflow.io` : '—');

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(task.description || '');
  const [savingDescription, setSavingDescription] = useState(false);

  const [newAttachments, setNewAttachments] = useState([]);
  const [attachmentsDirty, setAttachmentsDirty] = useState(false);
  const [savingAttachments, setSavingAttachments] = useState(false);
  const [hiddenAttachmentIds, setHiddenAttachmentIds] = useState([]);

  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    setDescriptionValue(task.description || '');
  }, [task.description]);

  useEffect(() => {
    setNewAttachments([]);
    setAttachmentsDirty(false);
  }, [task.attachments?.length]);

  useEffect(() => {
    setHiddenAttachmentIds([]);
  }, [task._id]);

  useEffect(() => {
    if (!assigneeDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAssigneeDropdownOpen(false);
        setAssigneeSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [assigneeDropdownOpen]);

  const buildTaskPayload = (overrides = {}) => ({
    title: task.title,
    description: overrides.description ?? task.description ?? '',
    status: overrides.status ?? task.status,
    priority: overrides.priority ?? task.priority,
    projectId: task.projectId,
    projectKey: task.projectKey || project?.key,
    type: task.type || 'task',
    attachments: overrides.attachments ?? attachments,
    assignee: typeof overrides.assignee !== 'undefined'
      ? overrides.assignee
      : assignee
        ? {
            username: assignee.username,
            name: assignee.name,
            email: assignee.email,
            avatar: assignee.avatar,
          }
        : null,
  });

  const handleDescriptionSave = async () => {
    if (!canEditTask) {
      setIsEditingDescription(false);
      return;
    }
    if (descriptionValue === (task.description || '')) {
      setIsEditingDescription(false);
      return;
    }
    try {
      setSavingDescription(true);
      await updateTask(task._id || task.id, buildTaskPayload({ description: descriptionValue }));
      setIsEditingDescription(false);
    } catch (err) {
      console.error('Failed to update description', err);
    } finally {
      setSavingDescription(false);
    }
  };

  const handleAttachmentUpload = (event) => {
    if (!canEditTask) return;
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = new Uint8Array(e.target.result);
        let binary = '';
        buffer.forEach(byte => {
          binary += String.fromCharCode(byte);
        });
        const base64Data = btoa(binary);
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data,
          __isNew: true,
        };
        setNewAttachments(prev => [...prev, newFile]);
        setAttachmentsDirty(true);
      };
      reader.readAsArrayBuffer(file);
    });
    event.target.value = '';
  };

  const handleRemoveAttachment = (fileId, isNew) => {
    if (!canEditTask) return;
    if (isNew) {
      setNewAttachments(prev => {
        const next = prev.filter(file => (file.id || file._id) !== fileId);
        if (next.length === 0) {
          setAttachmentsDirty(false);
        }
        return next;
      });
    } else {
      setHiddenAttachmentIds(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
    }
  };

  const handleAttachmentSave = async () => {
    if (!canEditTask) return;
    if (!attachmentsDirty) return;
    try {
      setSavingAttachments(true);
      const payloadAttachments = [...attachments, ...newAttachments];
      await updateTask(task._id || task.id, buildTaskPayload({ attachments: payloadAttachments }));
      setNewAttachments([]);
      setAttachmentsDirty(false);
    } catch (err) {
      console.error('Failed to update attachments', err);
    } finally {
      setSavingAttachments(false);
    }
  };

  const formatFileSize = (bytes = 0) => {
    if (!bytes) return '0 KB';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${units[i]}`;
  };

  const hiddenAttachmentSet = useMemo(() => new Set(hiddenAttachmentIds), [hiddenAttachmentIds]);
  const visibleExistingAttachments = attachments.filter(file => {
    const fileKey = file._id || file.id || file.name;
    return !hiddenAttachmentSet.has(fileKey);
  });
  const attachmentDisplayList = [
    ...visibleExistingAttachments.map(file => ({ file, isNew: false })),
    ...newAttachments.map(file => ({ file, isNew: true })),
  ];
  const hiddenCount = attachments.length - visibleExistingAttachments.length;

  const filteredUsers = useMemo(() => {
    if (!assigneeSearch.trim()) return executors;
    return executors.filter(candidate =>
      `${candidate.name} ${candidate.email}`.toLowerCase().includes(assigneeSearch.trim().toLowerCase())
    );
  }, [executors, assigneeSearch]);

  const handleAssigneeSelect = async (executorAccount) => {
    if (!canManageTasks) return;
    try {
      const assigneePayload = executorAccount
        ? {
            username: executorAccount.username,
            name: executorAccount.name,
            email: executorAccount.email,
            avatar: executorAccount.avatar,
          }
        : null;
      await updateTask(
        task._id || task.id,
        buildTaskPayload({ assignee: assigneePayload })
      );
      setAssigneeDropdownOpen(false);
      setAssigneeSearch('');
    } catch (err) {
      console.error('Failed to update assignee', err);
    }
  };

  const renderChip = (type, value) => {
    const styles = chipClass[type] || {};
    const fallback = type === 'priority' ? chipClass.priority.low : chipClass.status['todo'];
    return (
      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${styles[value] || fallback}`}>
        {value?.replace('-', ' ') || 'n/a'}
      </span>
    );
  };

  return (
    <div className="p-8 bg-gradient-to-br from-jira-bg via-blue-50/20 to-jira-bg dark:from-[var(--bg-body)] dark:via-[#0b1325]/50 dark:to-[var(--bg-body)] min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-jira-blue mb-6 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to board</span>
        </button>

        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-xl border border-gray-100 dark:border-[var(--border-color)] overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 dark:border-[var(--border-color)] bg-gradient-to-r from-white via-blue-50/30 to-white dark:from-transparent dark:via-white/5 dark:to-transparent">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-mono text-gray-500 dark:text-[var(--text-secondary)] mb-1">{project.key} · {task.type}</p>
                <h1 className="text-2xl font-bold text-jira-gray dark:text-[var(--text-primary)] mb-2">{task.title}</h1>
                <div className="flex flex-wrap gap-3">
                  {renderChip('status', task.status)}
                  {renderChip('priority', task.priority)}
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-[var(--text-secondary)]">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-jira-blue" />
                  <span>Task ID:</span>
                  <span className="font-mono font-semibold text-jira-gray dark:text-[var(--text-primary)]">{task._id || task.id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 border-b border-gray-100 dark:border-[var(--border-color)]">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-[var(--text-secondary)] uppercase tracking-wide">Description</h2>
                {canEditTask && (
                  <button
                    onClick={() => {
                      if (isEditingDescription) {
                        setDescriptionValue(task.description || '');
                      }
                      setIsEditingDescription(prev => !prev);
                    }}
                    className="flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-sky-500/20 text-jira-blue dark:text-sky-200 border border-blue-100 dark:border-sky-500/40 hover:shadow"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditingDescription ? 'Cancel' : 'Edit'}</span>
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <>
                  <textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    rows={5}
                    className="w-full p-5 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-[var(--text-primary)] border border-gray-200 dark:border-[var(--border-color)] focus:ring-2 focus:ring-jira-blue/70"
                    placeholder="Describe the work, acceptance criteria, or supporting notes..."
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      className="px-4 py-2 text-sm font-semibold rounded-full border border-gray-300 dark:border-[var(--border-color)] text-gray-600 dark:text-[var(--text-secondary)] hover:bg-gray-50 dark:hover:bg-white/10"
                      onClick={() => {
                        setDescriptionValue(task.description || '');
                        setIsEditingDescription(false);
                      }}
                    >
                      Discard
                    </button>
                    {canEditTask && (
                      <button
                        className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-jira-blue to-jira-blue-light text-white disabled:opacity-50"
                        onClick={handleDescriptionSave}
                        disabled={savingDescription || descriptionValue === (task.description || '')}
                      >
                        {savingDescription ? 'Saving...' : 'Save Description'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-[var(--text-primary)] leading-relaxed min-h-[120px] border border-transparent dark:border-[var(--border-color)]">
                  {task.description?.trim() ? task.description : 'No description provided.'}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-sky-500/10 border border-blue-100 dark:border-sky-500/30 relative" ref={dropdownRef}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-[var(--text-secondary)]">Assignee</h3>
                  {canManageTasks && (
                    <button
                      className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/60 dark:bg-white/10 text-jira-blue dark:text-sky-200 border border-blue-100 dark:border-white/15 flex items-center space-x-1"
                      onClick={() => setAssigneeDropdownOpen(prev => !prev)}
                      type="button"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{assigneeDropdownOpen ? 'Close' : 'Change'}</span>
                    </button>
                  )}
                </div>
                {assignee ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white flex items-center justify-center font-bold">
                      {assigneeAvatar}
                    </div>
                    <div>
                      <p className="font-semibold text-jira-gray dark:text-[var(--text-primary)]">{assigneeDisplayName}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-[var(--text-secondary)]">
                    <User className="w-4 h-4" />
                    <span>Unassigned</span>
                  </div>
                )}

                {canManageTasks && assigneeDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-3 p-3 rounded-2xl bg-white dark:bg-[var(--bg-surface)] border border-gray-200 dark:border-[var(--border-color)] shadow-2xl z-20">
                    <div className="flex items-center px-3 py-2 mb-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-[var(--border-color)]">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        placeholder="Search people by name..."
                        className="flex-1 bg-transparent text-sm px-3 text-gray-700 dark:text-[var(--text-primary)] placeholder-gray-400 focus:outline-none"
                      />
                      {assigneeSearch && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setAssigneeSearch('')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      <button
                        type="button"
                        onClick={() => handleAssigneeSelect(null)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-blue-50 dark:hover:bg-white/10"
                      >
                        <span className="text-gray-600 dark:text-[var(--text-secondary)]">Unassign</span>
                        {!assignee && <span className="text-xs text-jira-blue">Current</span>}
                      </button>
                      {filteredUsers.length === 0 && (
                        <p className="text-xs text-center text-gray-400 py-2">No matches</p>
                      )}
                      {filteredUsers.map(userOption => (
                        <button
                          key={userOption.username}
                          type="button"
                          onClick={() => handleAssigneeSelect(userOption)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-white/10 text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white text-xs flex items-center justify-center font-bold">
                              {userOption.avatar || userOption.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-jira-gray dark:text-[var(--text-primary)]">{userOption.name}</p>
                            </div>
                          </div>
                          {assignee && assignee.username && assignee.username === userOption.username && (
                            <span className="text-xs text-jira-blue">Selected</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-fuchsia-500/10 border border-purple-100 dark:border-fuchsia-500/30">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-[var(--text-secondary)] mb-3">Project</h3>
                <p className="font-semibold text-jira-gray dark:text-[var(--text-primary)]">{project.name}</p>
                <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)] mt-1">Key: {project.key}</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Paperclip className="w-5 h-5 text-jira-blue" />
                <h2 className="text-lg font-semibold text-jira-gray dark:text-[var(--text-primary)]">Attachments</h2>
                <span className="text-sm text-gray-500 dark:text-[var(--text-secondary)]">{attachmentDisplayList.length} files</span>
              </div>
            </div>

            {attachmentDisplayList.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-[var(--text-secondary)] bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-white/20" />
                <p>No attachments for this task yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {attachmentDisplayList.map(({ file, isNew }) => {
                  const fileId = file._id || file.id || `${file.name}-${file.size}`;
                  const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${file.data}`;
                  return (
                    <div key={fileId} className="flex items-center justify-between bg-blue-50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-2xl p-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-jira-gray dark:text-[var(--text-primary)]">{file.name}</p>
                          {isNew && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/40">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)]">{formatFileSize(file.size)}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <a
                          href={dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-jira-blue hover:underline"
                        >
                          View
                        </a>
                        <a
                          href={dataUrl}
                          download={file.name}
                          className="text-sm font-semibold text-jira-blue hover:underline"
                        >
                          Download
                        </a>
                        {canEditTask && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(fileId, isNew)}
                            className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20"
                            title={isNew ? 'Remove pending upload' : 'Hide locally (soft delete)'}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hiddenCount > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 dark:bg-amber-500/10 dark:border-amber-400/40 text-xs text-amber-700 dark:text-amber-200">
                <span>{hiddenCount} attachment{hiddenCount > 1 ? 's are' : ' is'} hidden locally. Refresh or show them again.</span>
                {canEditTask && (
                  <button
                    type="button"
                    onClick={() => setHiddenAttachmentIds([])}
                    className="font-semibold text-amber-800 dark:text-amber-100 underline-offset-2 hover:underline"
                  >
                    Show hidden
                  </button>
                )}
              </div>
            )}

            {canEditTask && (
              <div className="mt-6">
                <input
                  id="task-attachment-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
                <label
                  htmlFor="task-attachment-upload"
                  className="flex flex-col items-center justify-center px-6 py-10 border-2 border-dashed border-gray-300 dark:border-white/15 rounded-2xl bg-gray-50 dark:bg-white/5 hover:border-jira-blue dark:hover:border-sky-400 transition-all cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-3" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-[var(--text-secondary)]">Drop files here or click to upload</p>
                  <p className="text-xs text-gray-400">PDF, images, docs — up to 10MB each</p>
                </label>
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500 dark:text-[var(--text-secondary)]">
                  <p>
                    {attachmentsDirty
                      ? 'You have new attachments pending save.'
                      : hiddenCount > 0
                        ? 'Some attachments are hidden only in this view.'
                        : 'Attachments are synced to this task.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleAttachmentSave}
                    disabled={!attachmentsDirty || savingAttachments}
                    className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-jira-blue to-jira-blue-light text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingAttachments ? 'Saving...' : 'Save Attachments'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;

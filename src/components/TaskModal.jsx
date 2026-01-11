import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const normalizeUsername = (value = '') => value.trim().toLowerCase();

const buildAvatarFromName = (name = '', providedAvatar = '') => {
  if (providedAvatar?.trim()) {
    return providedAvatar.trim().slice(0, 2).toUpperCase();
  }

  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'TM';
};

const TaskModal = ({ isOpen, onClose, task = null, projectId }) => {
  const { addTask, updateTask, getProjectById } = useData();
  const { executors } = useAuth();
  const project = getProjectById(projectId);

  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const assigneeButtonRef = useRef(null);
  const assigneeMenuRef = useRef(null);
  const assigneeListRef = useRef(null);
  const [assigneeMenuStyle, setAssigneeMenuStyle] = useState(null);
  const selectedAssigneeUsernameRef = useRef('');

  const assigneeOptions = (() => {
    const options = [];
    const seen = new Set();

    const pushIfValid = (candidate) => {
      const username = normalizeUsername(candidate?.username || '');
      if (!username) return;
      if (seen.has(username)) return;
      seen.add(username);
      options.push({
        username,
        name: candidate?.name || candidate?.username || username,
        email: candidate?.email || '',
        avatar: candidate?.avatar || buildAvatarFromName(candidate?.name || username, candidate?.avatar),
      });
    };

    (executors || []).forEach(pushIfValid);

    const team = Array.isArray(project?.team) ? project.team : [];
    team.forEach((member) => {
      const derivedUsername = member?.executorUsername || member?.username || member?.email || member?.name;
      pushIfValid({
        username: derivedUsername,
        name: member?.name || derivedUsername,
        email: member?.email || '',
        avatar: member?.avatar || buildAvatarFromName(member?.name || derivedUsername, member?.avatar),
      });
    });

    return options;
  })();

  useEffect(() => {
    if (!assigneeMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      const clickedButton = assigneeButtonRef.current?.contains?.(target);
      const clickedMenu = assigneeMenuRef.current?.contains?.(target);
      if (!clickedButton && !clickedMenu) {
        setAssigneeMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAssigneeMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [assigneeMenuOpen]);

  const computeAssigneeMenuPlacement = () => {
    const trigger = assigneeButtonRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // estimate menu height: list max-h-56 (224px) + padding + borders
    const estimatedListHeight = Math.min((assigneeOptions.length || 1) * 44, 224);
    const estimatedMenuHeight = 12 + estimatedListHeight + 2;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estimatedMenuHeight + 12 && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.max(8, rect.top - 6 - estimatedMenuHeight)
      : Math.min(viewportHeight - 8 - estimatedMenuHeight, rect.bottom + 6);

    const left = Math.max(8, Math.min(rect.left, viewportWidth - 8 - rect.width));

    setAssigneeMenuStyle({
      position: 'fixed',
      left,
      top,
      width: rect.width,
      zIndex: 10050,
    });
  };

  useEffect(() => {
    if (!assigneeMenuOpen) return;

    computeAssigneeMenuPlacement();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!assigneeListRef.current) return;
        const selectedUsername = selectedAssigneeUsernameRef.current;
        if (!selectedUsername) {
          assigneeListRef.current.scrollTop = 0;
          return;
        }
        const safeValue = window?.CSS?.escape ? window.CSS.escape(selectedUsername) : selectedUsername;
        const selectedEl = assigneeListRef.current.querySelector(`[data-value="${safeValue}"]`);
        if (selectedEl?.scrollIntoView) {
          selectedEl.scrollIntoView({ block: 'nearest' });
        }
      });
    });
  }, [assigneeMenuOpen, assigneeOptions.length]);

  useEffect(() => {
    if (!assigneeMenuOpen) return undefined;
    const handleResize = () => computeAssigneeMenuPlacement();
    const handleScroll = () => computeAssigneeMenuPlacement();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [assigneeMenuOpen, assigneeOptions.length]);

  const buildInitialTaskState = (overrides = {}) => ({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: overrides.assignee ?? null,
    projectId,
    projectKey: project?.key || 'TASK',
    type: 'task',
    attachments: [],
    ...overrides,
  });

  const [formData, setFormData] = useState(() => (task ? buildInitialTaskState(task) : buildInitialTaskState()));
  const [uploadedFiles, setUploadedFiles] = useState(task?.attachments || []);

  useEffect(() => {
    selectedAssigneeUsernameRef.current = formData.assignee?.username || '';
  }, [formData.assignee?.username]);

  useEffect(() => {
    if (!isOpen) {
      setFormData(buildInitialTaskState());
      setUploadedFiles([]);
      setAssigneeMenuOpen(false);
      return;
    }

    if (task) {
      setFormData(buildInitialTaskState({
        ...task,
        assignee: task.assignee || null,
        projectId: task.projectId || projectId,
        projectKey: task.projectKey || project?.key || 'TASK',
      }));
      setUploadedFiles(task.attachments || []);
    } else {
      setFormData(buildInitialTaskState());
      setUploadedFiles([]);
      setAssigneeMenuOpen(false);
    }
  }, [task, isOpen, projectId, project?.key, executors, project?.team]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const assigneePayload = formData.assignee
      ? {
          username: formData.assignee.username,
          name: formData.assignee.name,
          email: formData.assignee.email,
          avatar: formData.assignee.avatar,
        }
      : null;
    const dataToSubmit = {
      ...formData,
      assignee: assigneePayload,
      attachments: uploadedFiles
    };
    if (task) {
      updateTask(task._id || task.id, dataToSubmit);
    } else {
      addTask(dataToSubmit);
    }
    setUploadedFiles([]);
    onClose();
  };

  const handleChange = (e) => {
    const value = e.target.value;
    const name = e.target.name;
    
    if (name === 'assignee') {
      const selectedUser = assigneeOptions.find(u => normalizeUsername(u.username) === normalizeUsername(value));
      setFormData({ ...formData, assignee: selectedUser || null });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        // Convert ArrayBuffer to Base64
        const arr = new Uint8Array(event.target.result);
        let binary = '';
        for (let i = 0; i < arr.byteLength; i++) {
          binary += String.fromCharCode(arr[i]);
        }
        const base64Data = btoa(binary);
        
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data
        };
        setUploadedFiles([...uploadedFiles, newFile]);
      };
      reader.readAsArrayBuffer(file);
    });
    e.target.value = '';
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={task ? 'Edit Task' : 'Create New Task'}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="flex-1 px-4 py-3 bg-jira-blue text-white rounded-lg hover:bg-jira-blue-light transition-colors font-medium"
          >
            {task ? 'Update' : 'Create'} Task
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            placeholder="What needs to be done?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            placeholder="Add more details..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Files
          </label>
          <div className="relative">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              accept="*/*"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-jira-blue hover:bg-blue-50 cursor-pointer transition-all duration-200 bg-gray-50"
            >
              <div className="text-center">
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, JPEG, PNG, and more
                </p>
              </div>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</p>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-jira-blue rounded flex items-center justify-center flex-shrink-0">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            >
              <option value="task">Task</option>
              <option value="story">Story</option>
              <option value="bug">Bug</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority *
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="hold">Hold</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignee
          </label>
          <div className="relative">
            <button
              ref={assigneeButtonRef}
              type="button"
              disabled={!assigneeOptions.length}
              onClick={() => {
                if (!assigneeOptions.length) return;
                setAssigneeMenuOpen((prev) => !prev);
              }}
              className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl text-lg focus:outline-none text-left flex items-center justify-between gap-3"
              aria-haspopup="listbox"
              aria-expanded={assigneeMenuOpen}
            >
              <span className="truncate text-jira-gray">
                {formData.assignee?.name
                  ? `${formData.assignee.name} (${formData.assignee.username})`
                  : 'Select a team member...'}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
            </button>

            {assigneeMenuOpen && assigneeMenuStyle && typeof document !== 'undefined' && createPortal(
              <div ref={assigneeMenuRef} style={assigneeMenuStyle} role="listbox" tabIndex={-1}>
                <div className="rounded-xl border border-gray-200 shadow-lg overflow-hidden bg-white/90 backdrop-blur-md">
                  <div ref={assigneeListRef} className="max-h-56 overflow-y-auto p-1.5">
                    <button
                      type="button"
                      role="option"
                      aria-selected={!formData.assignee}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, assignee: null }));
                        setAssigneeMenuOpen(false);
                      }}
                      className={
                        `w-full text-left px-3 py-2.5 rounded-lg transition text-base ` +
                        (!formData.assignee
                          ? 'bg-jira-bg/40 font-semibold text-jira-gray'
                          : 'text-gray-700 hover:bg-gray-50')
                      }
                    >
                      Select a team member...
                    </button>

                    {assigneeOptions.map((user) => (
                      <button
                        key={user.username}
                        type="button"
                        role="option"
                        data-value={user.username}
                        aria-selected={normalizeUsername(user.username) === normalizeUsername(formData.assignee?.username || '')}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, assignee: user }));
                          setAssigneeMenuOpen(false);
                        }}
                        className={
                          `w-full text-left px-3 py-2.5 rounded-lg transition text-base ` +
                          (normalizeUsername(user.username) === normalizeUsername(formData.assignee?.username || '')
                            ? 'bg-jira-bg/40 font-semibold text-jira-gray'
                            : 'text-gray-700 hover:bg-gray-50')
                        }
                      >
                        {user.name} ({user.username})
                      </button>
                    ))}
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>
          {!assigneeOptions.length && (
            <p className="text-xs text-red-500 mt-2">Add a team member to this project before assigning tasks.</p>
          )}
          {formData.assignee && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white text-xs flex items-center justify-center font-bold">
                {formData.assignee.avatar}
              </div>
              <span className="font-medium">Assigned to: {formData.assignee.name}</span>
            </div>
          )}
        </div>

      </form>
    </Modal>
  );
};

export default TaskModal;

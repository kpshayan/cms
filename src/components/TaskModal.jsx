import { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import Modal from './Modal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const normalizeUsername = (value = '') => value.trim().toLowerCase();

const TaskModal = ({ isOpen, onClose, task = null, projectId }) => {
  const { addTask, updateTask, getProjectById } = useData();
  const { executors } = useAuth();
  const project = getProjectById(projectId);

  const buildInitialTaskState = (overrides = {}) => ({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: overrides.assignee ?? executors[0] ?? null,
    projectId,
    projectKey: project?.key || 'TASK',
    type: 'task',
    attachments: [],
    ...overrides,
  });

  const [formData, setFormData] = useState(() => (task ? buildInitialTaskState(task) : buildInitialTaskState()));
  const [uploadedFiles, setUploadedFiles] = useState(task?.attachments || []);

  useEffect(() => {
    if (!isOpen) {
      setFormData(buildInitialTaskState());
      setUploadedFiles([]);
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
    }
  }, [task, isOpen, projectId, project?.key, executors]);

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
      const selectedUser = executors.find(u => normalizeUsername(u.username) === normalizeUsername(value));
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
          <select
            name="assignee"
            value={formData.assignee?.username || ''}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            disabled={!executors.length}
          >
            <option value="">Select an executor...</option>
            {executors.map(user => (
              <option key={user.username} value={user.username}>{user.name} ({user.username})</option>
            ))}
          </select>
          {!executors.length && (
            <p className="text-xs text-red-500 mt-2">Add an executor (admin3-*) from the dashboard before assigning tasks.</p>
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

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useData } from '../context/DataContext';

const createInitialFormState = () => ({
  name: ''
});

const ProjectModal = ({ isOpen, onClose, project = null, onSubmit }) => {
  const { addProject, updateProject } = useData();
  const [formData, setFormData] = useState(createInitialFormState);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || ''
      });
    } else {
      setFormData(createInitialFormState());
    }
  }, [project, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    } else {
      if (project) {
        const projectId = project._id || project.id;
        if (projectId) {
          updateProject(projectId, formData);
        }
      } else {
        addProject(formData);
      }
    }
    onClose();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={project ? 'Edit Project' : 'Create New Project'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent"
            placeholder="e.g., Website Redesign"
          />
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Project key is generated automatically when the project is created.
          </p>
        </div>

        {project?.key && (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            <p className="font-semibold text-gray-900 mb-1 dark:text-white">Project Key</p>
            <p className="text-2xl font-bold tracking-wide text-jira-blue">{project.key}</p>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">System assigned key – cannot be edited.</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-3 bg-jira-blue text-white rounded-lg hover:bg-jira-blue-light transition-colors font-medium"
          >
            {project ? 'Update' : 'Create'} Project
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectModal;

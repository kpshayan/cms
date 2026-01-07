import { useState, useEffect } from 'react';
import Modal from './Modal';

const buildInitialState = () => ({
  name: '',
  avatar: '',
  executorUsername: '',
});

const UserModal = ({ isOpen, onClose, onSubmit, user, error, canProvisionExecutors = false }) => {
  const [formData, setFormData] = useState(buildInitialState);

  useEffect(() => {
    if (!isOpen) {
      setFormData(buildInitialState());
      return;
    }

    if (user) {
      setFormData({
        name: user.name || '',
        avatar: user.avatar || '',
        executorUsername: '',
      });
    } else {
      setFormData(buildInitialState());
    }
  }, [user, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Generate avatar from name if not provided
    const avatarInitials = formData.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    onSubmit({
      ...formData,
      name: formData.name.trim(),
      executorUsername: formData.executorUsername.trim(),
      avatar: formData.avatar || avatarInitials
    });
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit Team Member' : 'Add Team Member'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g., John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-jira-blue"
          />
        </div>

        {canProvisionExecutors && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Executor Username (admin3-*) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="executorUsername"
              value={formData.executorUsername}
              onChange={handleChange}
              placeholder="admin3-5"
              required={canProvisionExecutors}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-jira-blue"
            />
            <p className="text-xs text-gray-500 mt-1">
              Username must be unique, start with admin3-, and will create the executor login for this member.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Avatar (Optional)
          </label>
          <input
            type="text"
            name="avatar"
            value={formData.avatar}
            onChange={handleChange}
            placeholder="2-letter initials (auto-generated from name)"
            maxLength={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-jira-blue uppercase"
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave blank to auto-generate from name
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-jira-blue to-jira-blue-light text-white rounded-md hover:shadow-lg transition-all"
          >
            {user ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;

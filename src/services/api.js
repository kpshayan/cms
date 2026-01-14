const API_BASE = import.meta.env.VITE_API_URL || '/api';

const apiCall = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  signup: (data) => apiCall('/auth/signup', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  login: (data) => apiCall('/auth/login', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  getMe: () => apiCall('/auth/me'),
  logout: () => apiCall('/auth/logout', { method: 'POST' }),
  resetAccount: (username) => apiCall('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ username })
  }),
  getExecutors: () => apiCall('/auth/executors'),
  createExecutor: (data) => apiCall('/auth/executors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateExecutor: (username, data) => apiCall(`/auth/executors/${username}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  resetExecutorPassword: (username) => apiCall(`/auth/executors/${username}/reset-password`, {
    method: 'POST',
  }),
  deleteExecutor: (username) => apiCall(`/auth/executors/${username}`, {
    method: 'DELETE',
  }),

  // Role assignment (Owner/admin1 only)
  getRoles: () => apiCall('/auth/roles'),
  assignRole: ({ username, role }) => apiCall('/auth/roles/assign', {
    method: 'POST',
    body: JSON.stringify({ username, role }),
  }),
};

// Projects API
export const projectAPI = {
  getAll: () => apiCall('/projects'),
  getById: (id) => apiCall(`/projects/${id}`),
  create: (data) => apiCall('/projects', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  update: (id, data) => apiCall(`/projects/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (id) => apiCall(`/projects/${id}`, { method: 'DELETE' }),
  addComment: (id, text) => apiCall(`/projects/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
  deleteComment: (id, commentId) => apiCall(`/projects/${id}/comments/${commentId}`, {
    method: 'DELETE',
  }),
  addTeamMember: (projectId, userId) => apiCall(`/projects/${projectId}/team`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  }),
  removeTeamMember: (projectId, userId) => apiCall(`/projects/${projectId}/team/${userId}`, { 
    method: 'DELETE' 
  }),
  getQuotations: (projectId) => apiCall(`/projects/${projectId}/quotations`),
  saveQuotations: (projectId, data) => apiCall(`/projects/${projectId}/quotations`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  downloadQuotationsPdf: async (projectId) => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/quotations/pdf`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch quotations PDF.';
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (err) {
        // ignore body parse errors
      }
      throw new Error(errorMessage);
    }

    return response.blob();
  },

  downloadQuotationVersionPdf: async (projectId, versionId) => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/quotations/versions/${versionId}/pdf`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Failed to fetch quotations PDF.';
      try {
        const errorData = await response.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch (err) {
        // ignore body parse errors
      }
      throw new Error(errorMessage);
    }

    return response.blob();
  },
};

// Tasks API
export const taskAPI = {
  getAll: () => apiCall('/tasks'),
  getByProject: (projectId) => apiCall(`/tasks?projectId=${projectId}`),
  getById: (id) => apiCall(`/tasks/${id}`),
  create: (data) => apiCall('/tasks', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  addComment: (id, text) => apiCall(`/tasks/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  }),
  deleteComment: (id, commentId) => apiCall(`/tasks/${id}/comments/${commentId}`, {
    method: 'DELETE',
  }),
  update: (id, data) => apiCall(`/tasks/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (id) => apiCall(`/tasks/${id}`, { method: 'DELETE' }),
  updateStatus: (id, status) => apiCall(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
};

// Users API
export const userAPI = {
  getAll: () => apiCall('/users'),
  getById: (id) => apiCall(`/users/${id}`),
  create: (data) => apiCall('/users', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  update: (id, data) => apiCall(`/users/${id}`, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  delete: (id) => apiCall(`/users/${id}`, { method: 'DELETE' }),
};

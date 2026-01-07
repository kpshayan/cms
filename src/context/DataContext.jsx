import { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { projectAPI, taskAPI, userAPI } from '../services/api';
import { useAuth } from './AuthContext';

const normalizeEmail = (value = '') => value.trim().toLowerCase();

const normalizeIdentifier = (value) => String(value ?? '').trim().toLowerCase();

const isTaskOwnedByUser = (task, username) => {
  if (!task || !username) return false;
  const normalizedUsername = normalizeIdentifier(username);
  const candidate = task.assignee;
  if (!candidate) return false;
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return normalizeIdentifier(candidate) === normalizedUsername;
  }
  const possibleMatches = [
    candidate.username,
    candidate.email,
    candidate._id,
    candidate.id,
  ].map(normalizeIdentifier);
  return possibleMatches.includes(normalizedUsername);
};

const buildAvatarFromName = (name = '', providedAvatar = '') => {
  if (providedAvatar?.trim()) {
    return providedAvatar.trim().slice(0, 2).toUpperCase();
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'PF';
};

const normalizeProjectId = (value) => String(value ?? '').trim();

const base64ToBlob = (base64) => {
  if (!base64 || typeof window === 'undefined') return null;
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  } catch (err) {
    console.error('Failed to convert base64 to Blob:', err);
    return null;
  }
};

const buildQuotationsStateMap = (projectList = []) => {
  return projectList.reduce((acc, project) => {
    const projectId = normalizeProjectId(project?._id || project?.id);
    if (!projectId) {
      return acc;
    }

    const quotationPayload = project?.quotations;
    if (!quotationPayload) {
      return acc;
    }

    acc[projectId] = {
      entries: quotationPayload.entries || [],
      generatedAt: quotationPayload.generatedAt || null,
      pdfName: quotationPayload.pdfName || 'Quotations.pdf',
      pdfAvailable: Boolean(quotationPayload.pdfAvailable),
      pdfBlob: null,
    };
    return acc;
  }, {});
};

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [quotationsByProject, setQuotationsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { hasPermission, user } = useAuth();
  const canManageAllTasks = hasPermission('manageTasks');
  const canViewTasks = hasPermission('viewTasks');
  const canManageOwnTasks = Boolean(user?.permissions?.manageOwnTasks);
  const restrictTasksToOwner = Boolean(user?.permissions?.viewOwnTasksOnly);
  const canManageTeamMembers = hasPermission('manageProjects') || hasPermission('manageTeamMembers');

  const visibleTasks = useMemo(() => {
    if (canManageAllTasks) {
      return tasks;
    }

    const shouldRestrictToOwner = restrictTasksToOwner && !canViewTasks;
    if (shouldRestrictToOwner) {
      return tasks.filter((task) => isTaskOwnedByUser(task, user?.username));
    }

    if (canViewTasks) {
      return tasks;
    }
    return [];
  }, [tasks, canManageAllTasks, restrictTasksToOwner, canViewTasks, user?.username]);

  const handleBackendError = (err, defaultMessage) => {
    const message = err?.message || defaultMessage || 'Failed to talk to the backend.';
    setError(message);
    throw err;
  };

  const syncUserAcrossProjects = (updatedUser) => {
    if (!updatedUser) return;
    setProjects(prev => {
      let mutated = false;
      const next = prev.map(project => {
        const team = Array.isArray(project.team) ? project.team : [];
        let teamMutated = false;
        const updatedTeam = team.map(member => {
          if (String(member._id || member.id) === String(updatedUser._id || updatedUser.id)) {
            teamMutated = true;
            mutated = true;
            return { ...member, ...updatedUser };
          }
          return member;
        });

        if (!teamMutated) {
          return project;
        }

        return {
          ...project,
          team: updatedTeam,
          updatedAt: new Date().toISOString(),
        };
      });

      if (!mutated) {
        return prev;
      }
      return next;
    });
  };

  const removeUserFromProjects = (userId) => {
    if (!userId) return;
    setProjects(prev => {
      let mutated = false;
      const next = prev.map(project => {
        const team = Array.isArray(project.team) ? project.team : [];
        const filteredTeam = team.filter(member => String(member._id || member.id) !== String(userId));
        if (filteredTeam.length === team.length) {
          return project;
        }
        mutated = true;
        return {
          ...project,
          team: filteredTeam,
          updatedAt: new Date().toISOString(),
        };
      });

      if (!mutated) {
        return prev;
      }
      return next;
    });
  };

  const ensurePermission = (permissionKey, defaultMessage) => {
    if (hasPermission(permissionKey)) {
      return;
    }
    const message = defaultMessage || 'You do not have permission to perform this action.';
    setError(message);
    throw new Error(message);
  };

  const ensureTeamManagementAccess = (defaultMessage) => {
    if (canManageTeamMembers) {
      return;
    }
    const message = defaultMessage || 'You do not have permission to manage team members.';
    setError(message);
    throw new Error(message);
  };

  const ensureTaskMutationAccess = (taskId, defaultMessage) => {
    if (canManageAllTasks) {
      return;
    }
    if (canManageOwnTasks) {
      const targetTask = tasks.find(t => String(t._id || t.id) === String(taskId));
      if (targetTask && isTaskOwnedByUser(targetTask, user?.username)) {
        return;
      }
      const message = defaultMessage || 'You can only modify tasks assigned to you.';
      setError(message);
      throw new Error(message);
    }
    ensurePermission('manageTasks', defaultMessage);
  };

  // Load all data on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        if (!isMounted) return;
        setProjects([]);
        setTasks([]);
        setUsers([]);
        setQuotationsByProject({});
        setLoading(false);
        setError(null);
        return;
      }

      setQuotationsByProject({});
      setLoading(true);
      try {
        const [projectsData, tasksData, usersData] = await Promise.all([
          projectAPI.getAll(),
          taskAPI.getAll(),
          userAPI.getAll()
        ]);

        if (!isMounted) return;

        setProjects(projectsData || []);
        setTasks(tasksData || []);
        setUsers(usersData || []);
        setQuotationsByProject(buildQuotationsStateMap(projectsData || []));
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        if (!isMounted) return;
        setError(err?.message || 'Failed to load data from backend.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const generateUniqueProjectKey = (projectName) => {
    const sanitizedName = (projectName || 'Project')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toUpperCase()
      .trim();

    const words = sanitizedName.split(/\s+/).filter(Boolean);
    let baseKey = words.slice(0, 3).map(word => word[0]).join('');

    if (baseKey.length < 3) {
      const condensed = sanitizedName.replace(/\s+/g, '');
      baseKey = (baseKey + condensed).slice(0, 3);
    }

    if (baseKey.length < 3) {
      baseKey = 'PRJ';
    }

    const existingKeys = new Set(
      projects
        .map(p => (p.key || '').toUpperCase())
        .filter(Boolean)
    );

    if (!existingKeys.has(baseKey)) {
      return baseKey;
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const buildSuffix = () => Array
      .from({ length: 2 }, () => alphabet[Math.floor(Math.random() * alphabet.length)])
      .join('');

    let attempts = 0;
    while (attempts < 50) {
      const candidate = `${baseKey}${buildSuffix()}`.slice(0, 5);
      if (!existingKeys.has(candidate)) {
        return candidate;
      }
      attempts += 1;
    }

    let fallback = `${baseKey}${Date.now().toString().slice(-2)}`.slice(0, 5);
    while (existingKeys.has(fallback)) {
      fallback = `${baseKey}${Math.floor(Math.random() * 100)}`.slice(0, 5);
    }

    return fallback.toUpperCase();
  };

  // Project operations
  const addProject = async (project) => {
    ensurePermission('manageProjects', 'You are not allowed to create projects.');
    const projectKey = generateUniqueProjectKey(project.name);
    try {
      const newProject = await projectAPI.create({
        name: project.name,
        key: projectKey,
        description: project.description,
        color: project.color
      });
      setProjects(prev => [...prev, newProject]);
      setError(null);
      return newProject;
    } catch (err) {
      return handleBackendError(err, 'Failed to create project.');
    }
  };

  const updateProject = async (id, updates) => {
    ensurePermission('manageProjects', 'You are not allowed to update projects.');
    try {
      const updated = await projectAPI.update(id, updates);
      setProjects(prev => prev.map(p => (String(p._id) === String(id) ? updated : p)));
      setError(null);
      return updated;
    } catch (err) {
      return handleBackendError(err, 'Failed to update project.');
    }
  };

  const deleteProject = async (id) => {
    ensurePermission('manageProjects', 'You are not allowed to delete projects.');
    try {
      await projectAPI.delete(id);
      setProjects(prev => prev.filter(p => String(p._id) !== String(id)));
      setTasks(prev => prev.filter(t => String(t.projectId) !== String(id)));
      setError(null);
    } catch (err) {
      handleBackendError(err, 'Failed to delete project.');
    }
  };

  // Task operations
  const addTask = async (task) => {
    ensurePermission('manageTasks', 'You do not have permission to create tasks.');
    try {
      const newTask = await taskAPI.create(task);
      setTasks(prev => [...prev, newTask]);
      setError(null);
      return newTask;
    } catch (err) {
      return handleBackendError(err, 'Failed to create task.');
    }
  };

  const updateTask = async (id, updates) => {
    ensureTaskMutationAccess(id, 'You do not have permission to update this task.');
    try {
      const updated = await taskAPI.update(id, updates);
      setTasks(prev => prev.map(t => (String(t._id) === String(id) ? updated : t)));
      setError(null);
      return updated;
    } catch (err) {
      return handleBackendError(err, 'Failed to update task.');
    }
  };

  const deleteTask = async (id) => {
    ensurePermission('manageTasks', 'You do not have permission to delete tasks.');
    try {
      await taskAPI.delete(id);
      setTasks(prev => prev.filter(t => String(t._id) !== String(id)));
      setError(null);
    } catch (err) {
      handleBackendError(err, 'Failed to delete task.');
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    ensureTaskMutationAccess(id, 'You do not have permission to modify this task.');
    try {
      const updated = await taskAPI.updateStatus(id, newStatus);
      setTasks(prev => prev.map(t => (String(t._id) === String(id) ? updated : t)));
      setError(null);
      return updated;
    } catch (err) {
      return handleBackendError(err, 'Failed to update task status.');
    }
  };

  const upsertQuotationsState = (projectId, payload = {}) => {
    const key = normalizeProjectId(projectId);
    if (!key) return null;
    const normalized = {
      entries: payload.entries || [],
      generatedAt: payload.generatedAt || null,
      pdfName: payload.pdfName || 'Quotations.pdf',
      pdfAvailable: Boolean(
        typeof payload.pdfAvailable === 'boolean'
          ? payload.pdfAvailable
          : payload.pdfBlob
      ),
      pdfBlob: payload.pdfBlob || null,
    };

    setQuotationsByProject(prev => ({
      ...prev,
      [key]: normalized,
    }));

    return normalized;
  };

  const clearQuotationsState = (projectId) => {
    const key = normalizeProjectId(projectId);
    if (!key) return;
    setQuotationsByProject(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const loadQuotationsForProject = async (projectId) => {
    const key = normalizeProjectId(projectId);
    if (!key) return null;
    try {
      const data = await projectAPI.getQuotations(projectId);
      if (!data) {
        clearQuotationsState(projectId);
        return null;
      }
      return upsertQuotationsState(projectId, {
        entries: data.entries || [],
        generatedAt: data.generatedAt,
        pdfName: data.pdfName,
        pdfAvailable: Boolean(data.pdfAvailable),
        pdfBlob: data.pdfBase64 ? base64ToBlob(data.pdfBase64) : null,
      });
    } catch (err) {
      return handleBackendError(err, 'Failed to load project quotations.');
    }
  };

  const saveQuotationsForProject = async (projectId, payload = {}) => {
    const key = normalizeProjectId(projectId);
    if (!key) return null;
    try {
      const response = await projectAPI.saveQuotations(projectId, {
        entries: payload.entries || [],
        generatedAt: payload.generatedAt,
        pdfName: payload.pdfName,
        pdfBase64: payload.pdfBase64,
      });
      return upsertQuotationsState(projectId, {
        entries: response?.entries || payload.entries || [],
        generatedAt: response?.generatedAt || payload.generatedAt,
        pdfName: response?.pdfName || payload.pdfName,
        pdfAvailable: typeof response?.pdfAvailable === 'boolean'
          ? response.pdfAvailable
          : Boolean(payload.pdfBlob),
        pdfBlob: payload.pdfBlob || null,
      });
    } catch (err) {
      return handleBackendError(err, 'Failed to save quotations.');
    }
  };

  const getQuotationsForProject = (projectId) => {
    const key = normalizeProjectId(projectId);
    if (!key) return null;
    return quotationsByProject[key] || null;
  };

  const fetchQuotationsPdf = async (projectId) => {
    const key = normalizeProjectId(projectId);
    if (!key) return null;
    try {
      const blob = await projectAPI.downloadQuotationsPdf(projectId);
      setQuotationsByProject(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {
            entries: [],
            generatedAt: null,
            pdfName: 'Quotations.pdf',
            pdfAvailable: true,
          }),
          pdfBlob: blob,
          pdfAvailable: true,
        },
      }));
      return blob;
    } catch (err) {
      return handleBackendError(err, 'Failed to fetch quotations PDF.');
    }
  };

  // Helper functions
  const getProjectById = (id) => {
    return projects.find(p => String(p._id) === String(id));
  };

  const getTasksByProject = (projectId) => {
    return visibleTasks.filter(t => String(t.projectId) === String(projectId));
  };

  const getTaskById = (taskId) => {
    if (!taskId) return undefined;
    return visibleTasks.find(t => String(t._id || t.id) === String(taskId));
  };

  // User operations
  const addUser = async (user) => {
    ensureTeamManagementAccess('You do not have permission to add users.');
    const normalizedEmail = user.email ? normalizeEmail(user.email) : '';
    const payload = {
      ...user,
      avatar: buildAvatarFromName(user.name, user.avatar),
    };

    if (normalizedEmail) {
      payload.email = normalizedEmail;
    } else {
      delete payload.email;
    }

    try {
      const newUser = await userAPI.create(payload);
      setUsers(prev => [...prev, newUser]);
      setError(null);
      return newUser;
    } catch (err) {
      return handleBackendError(err, 'Failed to create user.');
    }
  };

  const addProjectMember = async (projectId, memberData) => {
    ensureTeamManagementAccess('You do not have permission to manage team members.');
    const normalizedEmail = memberData.email ? normalizeEmail(memberData.email) : '';
    let userRecord = null;

    if (normalizedEmail) {
      userRecord = users.find(u => normalizeEmail(u.email) === normalizedEmail);
    }

    const memberPayload = normalizedEmail
      ? { ...memberData, email: normalizedEmail }
      : { ...memberData };

    if (!userRecord) {
      userRecord = await addUser(memberPayload);
    }

    if (!projectId || !(userRecord?._id || userRecord?.id)) {
      return userRecord;
    }

    const memberId = userRecord._id || userRecord.id;

    try {
      const updatedProject = await projectAPI.addTeamMember(projectId, memberId);
      setProjects(prev => {
        return prev.map(project =>
          String(project._id) === String(projectId) ? updatedProject : project
        );
      });
      setError(null);
      return userRecord;
    } catch (err) {
      return handleBackendError(err, 'Failed to add project member.');
    }
  };

  const removeProjectMember = async (projectId, userId) => {
    ensureTeamManagementAccess('You do not have permission to manage team members.');
    try {
      const updatedProject = await projectAPI.removeTeamMember(projectId, userId);
      setProjects(prev => {
        return prev.map(project =>
          String(project._id) === String(projectId) ? updatedProject : project
        );
      });
      setError(null);
    } catch (err) {
      handleBackendError(err, 'Failed to remove project member.');
    }
  };

  const updateUser = async (id, updates) => {
    ensureTeamManagementAccess('You do not have permission to update users.');
    try {
      const updated = await userAPI.update(id, updates);
      setUsers(prev => prev.map(u => (String(u._id) === String(id) ? updated : u)));
      syncUserAcrossProjects(updated);
      setError(null);
      return updated;
    } catch (err) {
      return handleBackendError(err, 'Failed to update user.');
    }
  };

  const deleteUser = async (id) => {
    ensureTeamManagementAccess('You do not have permission to delete users.');
    try {
      await userAPI.delete(id);
      setUsers(prev => prev.filter(u => String(u._id || u.id) !== String(id)));
      removeUserFromProjects(id);
      setError(null);
    } catch (err) {
      handleBackendError(err, 'Failed to delete user.');
    }
  };

  // Clear all data
  const clearAllData = () => {
    setProjects([]);
    setTasks([]);
    setUsers([]);
    setQuotationsByProject({});
  };

  return (
    <DataContext.Provider value={{
      projects,
      tasks: visibleTasks,
      users,
      loading,
      error,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      deleteTask,
      updateTaskStatus,
      addUser,
      updateUser,
      deleteUser,
      addProjectMember,
      removeProjectMember,
      getProjectById,
      getTasksByProject,
      getTaskById,
      clearAllData,
      saveQuotationsForProject,
      loadQuotationsForProject,
      getQuotationsForProject,
      fetchQuotationsPdf,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

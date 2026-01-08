const EXECUTOR_USERNAME_PREFIX = process.env.EXECUTOR_USERNAME_PREFIX || 'admin3-';

const EXECUTOR_ROLE_BLUEPRINT = {
  role: 'EXECUTOR',
  scope: 'Assigned tasks only',
  summary: 'Provisioned by admin1. Can work only on issues assigned to their username.',
  permissions: {
    manageProjects: false,
    manageTeamMembers: false,
    manageTasks: false,
    manageOwnTasks: true,
    viewProjects: true,
    viewTasks: true,
    viewOwnTasksOnly: false,
  },
};

const ROLE_DEFINITIONS = {
  admin1: {
    displayName: 'Admin One',
    role: 'FULL_ACCESS',
    scope: 'Full workspace access',
    avatar: 'A1',
    permissions: {
      manageProjects: true,
      manageTeamMembers: true,
      manageTasks: true,
      viewProjects: true,
      viewTasks: true,
    },
  },
  admin2: {
    displayName: 'Admin Two',
    role: 'TASK_EDITOR',
    scope: 'Task editing only',
    avatar: 'A2',
    permissions: {
      manageProjects: false,
      manageTeamMembers: true,
      manageTasks: true,
      viewProjects: true,
      viewTasks: true,
    },
  },
  admin4: {
    displayName: 'Admin Four',
    role: 'PROJECT_READ_ONLY',
    scope: 'Workspace read-only',
    avatar: 'A4',
    permissions: {
      manageProjects: false,
      manageTeamMembers: false,
      manageTasks: false,
      viewProjects: true,
      viewTasks: true,
    },
  },
};

module.exports = {
  EXECUTOR_ROLE_BLUEPRINT,
  ROLE_DEFINITIONS,
  EXECUTOR_USERNAME_PREFIX,
};

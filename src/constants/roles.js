export const EXECUTOR_ROLE_BLUEPRINT = {
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

export const ROLE_DEFINITIONS = {
  admin1: {
    displayName: 'Admin One',
    email: 'admin1@projectflow.io',
    role: 'FULL_ACCESS',
    scope: 'Full workspace access',
    summary: 'Create, update, and delete any project or task.',
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
    email: 'admin2@projectflow.io',
    role: 'TASK_EDITOR',
    scope: 'Task editing only',
    summary: 'Can create and update tasks but cannot change project settings.',
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
    email: 'admin4@projectflow.io',
    role: 'PROJECT_READ_ONLY',
    scope: 'Workspace read-only',
    summary: 'View full project data with zero edit capabilities.',
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

export const ROLE_SUMMARY = [
  ...Object.entries(ROLE_DEFINITIONS).map(([username, details]) => ({
    username,
    role: details.role,
    scope: details.scope,
    summary: details.summary,
  })),
  {
    username: 'admin3-*',
    role: EXECUTOR_ROLE_BLUEPRINT.role,
    scope: EXECUTOR_ROLE_BLUEPRINT.scope,
    summary: EXECUTOR_ROLE_BLUEPRINT.summary,
  },
];

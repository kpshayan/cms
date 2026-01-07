import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Folder, CheckCircle2, Clock, AlertCircle, TrendingUp, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ProjectModal from '../components/ProjectModal';

const ProjectsOverview = () => {
  const { projects, getTasksByProject, deleteProject, updateProject } = useData();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const canManageProjects = hasPermission('manageProjects');

  const getProjectStats = (projectId) => {
    const tasks = getTasksByProject(projectId);
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      todo: tasks.filter(t => t.status === 'todo').length
    };
  };

  const handleDeleteProject = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project? All related tasks will be deleted.')) {
      deleteProject(projectId);
      setActiveMenu(null);
    }
  };

  const handleEditProject = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setShowProjectModal(true);
    setActiveMenu(null);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
  };

  const toggleMenu = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenu(activeMenu === projectId ? null : projectId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-jira-bg via-blue-50/30 to-purple-50/20 dark:from-[#050815] dark:via-[#060d1f] dark:to-[#0a1327]">
      {/* Header */}
      <div className="bg-gradient-to-r from-white via-blue-50/50 to-white border-b border-blue-100 shadow-sm dark:from-[#070e1d] dark:via-[#050c1a] dark:to-[#040916] dark:border-white/5 dark:shadow-[0_20px_50px_rgba(1,4,14,0.65)]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div style={{ animation: 'slideInLeft 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-jira-blue to-blue-600 bg-clip-text text-transparent mb-2">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-gray-600 text-lg dark:text-gray-300">Manage your projects and track progress</p>
            </div>
            {canManageProjects && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-jira-blue to-blue-600 text-white px-8 py-4 rounded-xl hover:shadow-2xl transition-all duration-300 font-semibold shadow-lg hover:scale-105 transform"
                style={{ animation: 'slideInRight 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <Folder className="w-24 h-24 text-gray-300 mx-auto mb-6 animate-pulse" />
            <h3 className="text-2xl font-semibold text-gray-600 mb-3 dark:text-gray-200">No projects yet</h3>
            <p className="text-gray-500 mb-6 text-lg dark:text-gray-400">Create your first project to get started</p>
            {canManageProjects && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-jira-blue to-blue-600 text-white px-8 py-3 rounded-xl hover:shadow-xl transition-all duration-300 font-semibold hover:scale-105 transform"
              >
                <Plus className="w-5 h-5" />
                <span>Create Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project, index) => {
              const projectId = project._id || project.id;
              const projectColor = project.color || '#0052CC';
              const projectKey = project.key || 'PRJ';
              const stats = getProjectStats(projectId);
              const completionRate = stats.total > 0 
                ? Math.round((stats.completed / stats.total) * 100) 
                : 0;

              return (
                <div
                  key={projectId}
                  className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:shadow-2xl hover:border-blue-300 hover:scale-[1.02] hover:-translate-y-2 transition-all duration-500 group relative dark:bg-[var(--bg-surface)] dark:border-white/5 dark:hover:border-jira-blue/40"
                  style={{ 
                    animation: `slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both`
                  }}
                >
                  {/* Project Header */}
                  <div 
                    className="h-28 flex items-center justify-between px-6 relative"
                    style={{ backgroundColor: projectColor + '20' }}
                  >
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ backgroundColor: projectColor, animation: 'pulse 3s ease-in-out infinite' }}></div>
                    </div>
                    <Link
                      to={`/dashboard/project/${projectId}/summary`}
                      className="flex items-center space-x-3 flex-1 z-10"
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
                        style={{ backgroundColor: projectColor }}
                      >
                        {projectKey}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-jira-gray group-hover:text-jira-blue transition-colors duration-300 dark:text-white">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{projectKey}</p>
                      </div>
                    </Link>
                    
                    {/* Actions Menu */}
                    {canManageProjects && (
                      <div className="relative" style={{ zIndex: 30 }}>
                        <button
                          onClick={(e) => toggleMenu(e, projectId)}
                          className="p-2 hover:bg-white/50 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-90 dark:hover:bg-white/10"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        {activeMenu === projectId && (
                          <>
                            <div 
                              className="fixed inset-0" 
                              style={{ zIndex: 40 }}
                              onClick={() => setActiveMenu(null)}
                            />
                            <div 
                              className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border-2 border-blue-100 py-2 min-w-[180px] overflow-hidden dark:bg-[var(--bg-surface)] dark:border-white/10"
                              style={{ 
                                zIndex: 50,
                                animation: 'slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                              }}
                            >
                              <button
                                onClick={(e) => handleEditProject(e, project)}
                                className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 flex items-center space-x-3 transition-all duration-300 hover:scale-105 transform dark:text-gray-200 dark:hover:from-white/10 dark:hover:to-white/0"
                              >
                                <Edit2 className="w-4 h-4 text-jira-blue" />
                                <span className="font-medium">Edit Project</span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteProject(e, projectId)}
                                className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-500/10 dark:hover:to-transparent flex items-center space-x-3 transition-all duration-300 hover:scale-105 transform"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="font-medium">Delete Project</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Project Content */}
                  <div className="overflow-hidden rounded-b-2xl">
                    <Link
                      to={`/dashboard/project/${projectId}/summary`}
                      className="block p-6"
                    >
                    <p className="text-gray-600 text-sm mb-6 line-clamp-2 group-hover:text-gray-800 transition-colors duration-300 dark:text-gray-300 dark:group-hover:text-gray-100">
                      {project.description || 'No description'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-lg hover:scale-110 transition-all duration-300 transform">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                        <p className="text-xs text-green-700 font-medium">Done</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:shadow-lg hover:scale-110 transition-all duration-300 transform">
                        <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                        <p className="text-3xl font-bold text-orange-600">{stats.inProgress}</p>
                        <p className="text-xs text-orange-700 font-medium">In Progress</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg hover:scale-110 transition-all duration-300 transform dark:from-white/5 dark:to-white/5 dark:border-white/10">
                        <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-2 dark:text-gray-300" />
                        <p className="text-3xl font-bold text-gray-600 dark:text-gray-200">{stats.todo}</p>
                        <p className="text-xs text-gray-700 font-medium dark:text-gray-300">To Do</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-700 flex items-center font-medium dark:text-gray-200">
                          <TrendingUp className="w-4 h-4 mr-2 text-jira-blue" />
                          Progress
                        </span>
                        <span className="font-bold text-jira-gray text-lg dark:text-white">{completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner dark:bg-white/10">
                        <div
                          className="h-3 rounded-full transition-all duration-500 shadow-lg"
                          style={{ 
                            width: `${completionRate}%`,
                            background: `linear-gradient(to right, ${projectColor}, ${projectColor}dd)`,
                            boxShadow: `0 0 10px ${projectColor}66`
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Modal */}
      {canManageProjects && (
        <ProjectModal 
          isOpen={showProjectModal}
          onClose={handleCloseModal}
          project={editingProject}
        />
      )}
    </div>
  );
};

export default ProjectsOverview;

import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers, PanelLeftClose, PanelLeftOpen, LogOut, Home } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const { id } = useParams();
  const currentProjectId = id ? String(id) : null;
  const { user, logout } = useAuth();
  const { projects } = useData();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBrandClick = () => {
    navigate('/dashboard');
  };

  return (
    <div 
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-gradient-to-b from-white via-blue-50/20 to-white dark:from-[#060c1b] dark:via-[#050815] dark:to-[#04060d] border-r-2 border-blue-100 dark:border-white/5 h-screen fixed left-0 top-0 transition-all duration-500 ease-in-out flex flex-col shadow-xl dark:shadow-[0_25px_60px_rgba(2,5,16,0.8)] z-50`}
    >
      {/* Header */}
      <div className="h-16 border-b-2 border-blue-100 dark:border-white/5 flex items-center justify-between px-4 bg-gradient-to-r from-jira-blue/10 to-transparent dark:from-white/5 dark:to-transparent">
        {!collapsed && (
          <button
            type="button"
            onClick={handleBrandClick}
            className="flex items-center space-x-2 group focus:outline-none"
            style={{ animation: 'slideInLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-jira-blue to-blue-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-jira-blue to-blue-600 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              ProjectFlow
            </span>
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-blue-50 rounded-lg transition-all duration-300 hover:scale-110 hover:rotate-90 dark:hover:bg-white/10"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-jira-blue" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-jira-blue" />
          )}
        </button>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {/* Dashboard Home Link */}
          <Link
            to="/dashboard"
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              !id ? 'bg-gradient-to-r from-jira-blue to-blue-600 text-white shadow-lg' : 'text-jira-gray hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:text-gray-200 dark:hover:from-white/10 dark:hover:to-white/5'
            }`}
            title={collapsed ? 'Dashboard' : ''}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-semibold">Dashboard</span>}
          </Link>
        </nav>

        {!collapsed && (
          <div className="px-4 my-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
              Your Projects
            </h3>
          </div>
        )}
        
        <nav className="space-y-1 px-2">
          {projects.length === 0 ? (
            !collapsed && (
              <div className="px-3 py-6 text-center">
                <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No projects yet</p>
                <Link
                  to="/dashboard"
                  className="text-xs text-jira-blue hover:underline mt-1 inline-block"
                >
                  Create one
                </Link>
              </div>
            )
          ) : (
            projects.map((project, index) => {
              const projectId = project._id || project.id;
              const projectColor = project.color || '#0052CC';
              const isActive = String(currentProjectId) === String(projectId);
              const projectKey = project.key || 'PRJ';

              return (
              <Link
                key={projectId}
                to={`/dashboard/project/${projectId}/summary`}
                className={`
                  flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 transform hover:scale-105
                  ${isActive
                    ? 'bg-gradient-to-r from-jira-blue to-blue-600 text-white shadow-lg'
                    : 'text-jira-gray hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:text-gray-200 dark:hover:from-white/10 dark:hover:to-white/5'
                  }
                `}
                style={{ 
                  animation: collapsed ? 'none' : `slideInLeft 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both`
                }}
                title={collapsed ? project.name : ''}
              >
                <div 
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: projectColor }}
                >
                  {projectKey}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className={`text-xs truncate ${
                      isActive ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {projectKey}
                    </p>
                  </div>
                )}
              </Link>
            );
            })
          )}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t-2 border-blue-100 dark:border-white/5 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-white/5 dark:to-transparent">
        {!collapsed && user && (
          <div className="mb-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-white/5 dark:to-white/0 rounded-xl border border-blue-200 dark:border-white/10 hover:shadow-md transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jira-blue to-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-md hover:scale-110 hover:rotate-12 transition-all duration-300">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-jira-gray truncate dark:text-gray-100">{user.name}</p>
                <p className="text-xs text-gray-600 truncate dark:text-gray-300">{user.email}</p>
                {user.role && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-jira-blue mt-1 dark:text-blue-200">
                    {user.role.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-start space-x-2'} px-3 py-3 rounded-xl text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-500/10 dark:hover:to-transparent transition-all duration-300 font-semibold hover:scale-105 transform border-2 border-transparent hover:border-red-200 dark:hover:border-red-400/40`}
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

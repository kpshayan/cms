import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, ListTodo, KanbanSquare, Quote } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { id } = useParams();
  const { getProjectById } = useData();
  const { user } = useAuth();
  const project = getProjectById(id);
  const projectColor = project?.color || '#0052CC';
  const projectKey = project?.key || 'PRJ';
  const isAdminOne = user?.username === 'admin1';

  const navItems = [
    { to: `/dashboard/project/${id}/summary`, label: 'Summary', icon: LayoutDashboard },
    { to: `/dashboard/project/${id}/backlog`, label: 'Backlog', icon: ListTodo },
    { to: `/dashboard/project/${id}/board`, label: 'Board', icon: KanbanSquare },
    isAdminOne && { to: `/dashboard/project/${id}/quotations`, label: 'Quotations', icon: Quote },
  ].filter(Boolean);

  if (!project) return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
              style={{ backgroundColor: projectColor }}
            >
              {projectKey}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-jira-gray">{project.name}</h1>
              <p className="text-sm text-gray-500">{project.description}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 -mb-px">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-2 px-4 py-2.5 border-b-2 transition-all duration-200 ${
                  isActive
                    ? 'border-jira-blue text-jira-blue font-medium'
                    : 'border-transparent text-gray-600 hover:text-jira-gray hover:border-gray-300'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;

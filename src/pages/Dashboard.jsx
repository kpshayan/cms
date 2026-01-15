import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ProjectsOverview from './ProjectsOverview';
import Summary from './Summary';
import Backlog from './Backlog';
import Board from './Board';
import Quotations from './Quotations';
import Roles from './Roles';
import { useAuth } from '../context/AuthContext';
import TaskDetails from './TaskDetails';
import { useSidebar } from '../context/SidebarContext';

const Dashboard = () => {
  const location = useLocation();
  const contentRef = useRef(null);
  const { collapsed } = useSidebar();
  const { user } = useAuth();
  const isAdminOne = user?.role === 'FULL_ACCESS';

  useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
  }, [location.pathname]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-jira-bg dark:bg-[var(--bg-body)]">
      <Sidebar />
      
      <div
        ref={contentRef}
        className={`flex-1 min-h-0 overflow-y-auto transition-all duration-500 ${collapsed ? 'ml-16' : 'ml-64'}`}
      >
        <Routes>
          {/* Dashboard Home */}
          <Route index element={<ProjectsOverview />} />

          {/* Roles */}
          <Route path="roles" element={<Roles />} />
          
          {/* Project routes */}
          <Route path="project/:id/*" element={
            <>
              <Header />
              <Routes>
                <Route index element={<Navigate to="summary" replace />} />
                <Route path="summary" element={<Summary />} />
                <Route path="backlog" element={<Backlog />} />
                <Route path="board" element={<Board />} />
                {isAdminOne && (
                  <Route path="quotations" element={<Quotations />} />
                )}
                <Route path="tasks/:taskId" element={<TaskDetails />} />
                <Route path="*" element={<Navigate to="summary" replace />} />
              </Routes>
            </>
          } />
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { 
  KanbanSquare,
  Bug,
  FileText,
  CheckCircle2,
  GripVertical,
  Plus,
  Circle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';

const Board = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProjectById, getTasksByProject, updateTaskStatus } = useData();
  const { hasPermission, user } = useAuth();
  const project = getProjectById(id);
  const allTasks = getTasksByProject(id);
  const canAddTasks = hasPermission('manageTasks');
  const canManageTasks = hasPermission('manageTasks');
  const canManageOwnTasks = Boolean(user?.permissions?.manageOwnTasks);
  const canViewTasks = hasPermission('viewTasks');
  const canOpenTasks = canManageTasks || canManageOwnTasks || canViewTasks;
  const canDragTasks = canManageTasks || canManageOwnTasks;
  
  const [draggedTask, setDraggedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const dragClickGuardRef = useRef(false);

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo', color: 'border-gray-300 dark:border-slate-600/70' },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: 'border-orange-300 dark:border-orange-500/70' },
    { id: 'hold', title: 'Hold', status: 'hold', color: 'border-yellow-300 dark:border-yellow-400/70' },
    { id: 'done', title: 'Done', status: 'done', color: 'border-green-300 dark:border-emerald-500/70' }
  ];

  const getTaskId = (task) => task?._id || task?.id;

  const handleDragStart = (event, task) => {
    if (!canDragTasks) return;
    dragClickGuardRef.current = true;
    setDraggedTask(task);
  };

  const handleDragOver = (e) => {
    if (!canDragTasks) return;
    e.preventDefault();
  };

  const handleDrop = (status) => {
    if (!canDragTasks || !draggedTask) {
      return;
    }
    if (draggedTask) {
      updateTaskStatus(getTaskId(draggedTask), status);
      setDraggedTask(null);
    }
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
  };

  const openTaskDetails = (task) => {
    if (!canOpenTasks) {
      return;
    }
    const taskId = getTaskId(task);
    if (!taskId) return;
    navigate(`/dashboard/project/${id}/tasks/${taskId}`);
  };

  const handleCardClick = (task) => {
    if (dragClickGuardRef.current) {
      dragClickGuardRef.current = false;
      return;
    }
    openTaskDetails(task);
  };

  const handleDragEnd = () => {
    if (!canDragTasks) return;
    setTimeout(() => {
      dragClickGuardRef.current = false;
    }, 0);
    setDraggedTask(null);
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4 text-red-600" />;
      case 'story':
        return <FileText className="w-4 h-4 text-green-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500 dark:border-l-red-400';
      case 'medium':
        return 'border-l-4 border-l-orange-500 dark:border-l-orange-400';
      case 'low':
        return 'border-l-4 border-l-gray-400 dark:border-l-slate-500';
      default:
        return 'border-l-4 border-l-gray-400 dark:border-l-slate-500';
    }
  };

  const TaskCard = ({ task }) => {
    const taskId = getTaskId(task);
    return (
    <div
      draggable={canDragTasks}
      onDragStart={(event) => handleDragStart(event, task)}
      onDragEnd={handleDragEnd}
      onClick={() => handleCardClick(task)}
      className={`bg-white dark:bg-[var(--bg-surface)] rounded-xl shadow-md border border-gray-200 dark:border-[var(--border-color)] p-4 mb-3 cursor-pointer hover:shadow-xl hover:scale-[1.02] dark:hover:bg-white/5 transition-all duration-200 group ${getPriorityColor(task.priority)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getTaskIcon(task.type)}
          <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-white/10 dark:text-[var(--text-primary)] px-2.5 py-1 rounded font-semibold">
            {taskId}
          </span>
        </div>
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>
      
      <h3 className="text-sm font-semibold text-jira-gray dark:text-[var(--text-primary)] mb-2 leading-snug line-clamp-2">
        {task.title}
      </h3>
      
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-[var(--border-color)]">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            task.priority === 'high' ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/50' :
            task.priority === 'medium' ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/50' :
            'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/5 dark:text-[var(--text-secondary)] dark:border-white/10'
          }`}>
            {task.priority}
          </span>
          <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-white/5 px-2.5 py-1 rounded-full">
            <div 
              className="w-6 h-6 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white text-xs flex items-center justify-center font-bold shadow-sm"
              title={task.assignee?.name || 'Unassigned'}
            >
              {task.assignee?.avatar || '?'}
            </div>
            <span className="text-xs font-medium text-jira-gray dark:text-[var(--text-secondary)]">
              {task.assignee?.name || 'Unassigned'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
  };

  const Column = ({ column }) => {
    const columnTasks = allTasks.filter(task => task.status === column.status);
    
    return (
      <div className="flex-1 min-w-0">
        <div className={`bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[rgba(19,27,46,0.9)] dark:to-[rgba(8,12,24,0.9)] rounded-2xl p-5 h-full border-t-4 shadow-sm dark:shadow-[0_20px_45px_rgba(0,0,0,0.65)] ${column.color}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-jira-gray dark:text-[var(--text-primary)] uppercase text-sm tracking-wider flex items-center space-x-2">
              <span>{column.title}</span>
            </h2>
            <div className="flex items-center space-x-2">
              <span className="bg-white dark:bg-white/5 text-jira-gray dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-gray-200 dark:border-white/10">
                {columnTasks.length}
              </span>
            </div>
          </div>
          
          <div
            onDragOver={canDragTasks ? handleDragOver : undefined}
            onDrop={canDragTasks ? () => handleDrop(column.status) : undefined}
            className={`space-y-3 min-h-[600px] pb-4 ${canDragTasks ? '' : 'cursor-not-allowed'}`}
          >
            {columnTasks.map(task => (
              <TaskCard key={getTaskId(task)} task={task} />
            ))}
            
            {columnTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-sm">
                <Circle className="w-10 h-10 text-gray-300 dark:text-white/15 mb-2" />
                <p className="text-sm text-gray-400 dark:text-[var(--text-secondary)] font-medium">Drop tasks here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!project) return <div>Project not found</div>;

  return (
    <div className="p-8 bg-gradient-to-br from-jira-bg via-blue-50/30 to-jira-bg dark:from-[var(--bg-body)] dark:via-[#0b1325] dark:to-[var(--bg-body)] transition-colors min-h-screen overflow-hidden">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-jira-gray mb-2 flex items-center">
            <KanbanSquare className="w-7 h-7 mr-3 text-jira-blue" />
            Board
          </h1>
          <p className="text-gray-600 text-lg dark:text-[var(--text-secondary)]">
            Click a card to view details, or click and drag it into another column to update its status.
          </p>
        </div>
        {canAddTasks && (
          <button
            onClick={() => {
              setShowTaskModal(true);
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-jira-blue to-jira-blue-light dark:from-sky-500 dark:to-indigo-500 text-white px-8 py-4 rounded-xl hover:shadow-2xl dark:shadow-[0_20px_45px_rgba(15,23,42,0.45)] transition-all duration-200 font-bold text-lg"
          >
            <Plus className="w-6 h-6" />
            <span>Add Task</span>
          </button>
        )}
      </div>

      <div className="flex gap-6 w-full">
        {columns.map(column => (
          <Column key={column.id} column={column} />
        ))}
      </div>

      {/* Task Modal */}
      {canManageTasks && (
        <TaskModal 
          isOpen={showTaskModal}
          onClose={handleCloseModal}
          task={null}
          projectId={id}
        />
      )}
    </div>
  );
};

export default Board;

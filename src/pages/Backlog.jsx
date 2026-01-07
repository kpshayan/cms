import { useNavigate, useParams } from 'react-router-dom';
import { 
  ListTodo, 
  CheckCircle2,
  Circle,
  Bug,
  FileText,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';

const Backlog = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    getProjectById, 
    getTasksByProject,
    deleteTask
  } = useData();
  const { hasPermission, user } = useAuth();
  
  const project = getProjectById(id);
  const projectTasks = getTasksByProject(id) || [];
  const canAddTasks = hasPermission('manageTasks');
  const canManageTasks = hasPermission('manageTasks');
  const canManageOwnTasks = Boolean(user?.permissions?.manageOwnTasks);
  const canViewTasks = hasPermission('viewTasks');
  const canOpenTasks = canManageTasks || canManageOwnTasks || canViewTasks;
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const sortedTasks = useMemo(() => {
    const clone = [...projectTasks];
    const getTimestamp = (task) => {
      const target = task?.updatedAt || task?.createdAt;
      return target ? new Date(target).getTime() : 0;
    };
    return clone.sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [projectTasks]);

  const statusSummary = useMemo(() => {
    const tally = { todo: 0, inProgress: 0, hold: 0, done: 0 };
    projectTasks.forEach((task) => {
      const status = task?.status || 'todo';
      if (status === 'in-progress') tally.inProgress += 1;
      else if (status === 'hold') tally.hold += 1;
      else if (status === 'done') tally.done += 1;
      else tally.todo += 1;
    });
    return tally;
  }, [projectTasks]);

  const handleEditTask = (task) => {
    if (!canManageTasks) return;
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId) => {
    if (!canManageTasks) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
    }
  };

  const getTaskId = (task) => task?._id || task?.id;

  const openTaskDetails = (task) => {
    if (!canOpenTasks) return;
    const taskIdentifier = getTaskId(task);
    if (!taskIdentifier) return;
    navigate(`/dashboard/project/${id}/tasks/${taskIdentifier}`);
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
        return 'text-red-600 bg-red-50 border border-red-100 dark:text-red-300 dark:bg-red-500/20 dark:border-red-500/40';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border border-orange-100 dark:text-orange-300 dark:bg-orange-500/20 dark:border-orange-500/40';
      case 'low':
        return 'text-gray-600 bg-gray-50 border border-gray-200 dark:text-[var(--text-secondary)] dark:bg-white/5 dark:border-white/10';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200 dark:text-[var(--text-secondary)] dark:bg-white/5 dark:border-white/10';
    }
  };

  const TaskRow = ({ task }) => {
    const taskId = getTaskId(task);
    return (
    <div
      className={`flex items-center justify-between p-4 hover:bg-blue-50/50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-[var(--border-color)] transition-all ${canOpenTasks ? 'cursor-pointer group' : 'cursor-default'}`}
      onClick={() => openTaskDetails(task)}
    >
      <div className="flex items-center space-x-4 flex-1">
        <div className="flex-shrink-0">
          {getTaskIcon(task.type)}
        </div>
        <span className="text-xs font-mono text-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 px-3 py-1.5 rounded-lg min-w-[70px] text-center font-bold shadow-sm dark:text-[var(--text-primary)]">
          {taskId}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-jira-gray group-hover:text-jira-blue dark:group-hover:text-sky-300 transition-colors mb-1">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {canManageTasks && (
          <button
            onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
            className="p-2 hover:bg-blue-100 dark:hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Edit task"
          >
            <Edit2 className="w-4 h-4 text-jira-blue" />
          </button>
        )}
        {canManageTasks && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteTask(taskId); }}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
          task.status === 'done' ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/50' :
          task.status === 'in-progress' ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/50' :
          task.status === 'hold' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/50' :
          'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/5 dark:text-[var(--text-secondary)] dark:border-white/10'
        }`}>
          {task.status.replace('-', ' ')}
        </span>
        <div className="flex items-center space-x-1.5 bg-blue-50 dark:bg-white/5 px-3 py-1.5 rounded-full">
          <div 
            className="w-7 h-7 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white text-xs flex items-center justify-center font-bold shadow-sm"
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
  );
  };

  if (!project) return <div>Project not found</div>;

  return (
    <div className="p-8 bg-gradient-to-br from-jira-bg via-purple-50/20 to-jira-bg dark:from-[var(--bg-body)] dark:via-[#0b1220] dark:to-[var(--bg-body)] min-h-screen transition-colors">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-jira-gray mb-2 flex items-center">
            <ListTodo className="w-7 h-7 mr-3 text-jira-blue" />
            Backlog
          </h1>
          <p className="text-gray-600 text-lg">Plan and prioritize your team's work</p>
        </div>
        <div className="flex space-x-4">
          {canAddTasks && (
            <button
              onClick={() => {
                setEditingTask(null);
                setShowTaskModal(true);
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-jira-blue to-jira-blue-light dark:from-sky-500 dark:to-indigo-500 text-white px-8 py-4 rounded-xl hover:shadow-2xl dark:shadow-[0_20px_45px_rgba(15,23,42,0.45)] transition-all duration-200 font-bold text-lg"
            >
              <Plus className="w-6 h-6" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-xl border border-gray-100 dark:border-[var(--border-color)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-[var(--border-color)] flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-white via-blue-50/40 to-white dark:from-transparent dark:via-white/5 dark:to-transparent">
          <div>
            <p className="text-sm font-semibold text-jira-blue tracking-wide uppercase">Project Backlog</p>
            <h2 className="text-2xl font-bold text-jira-gray dark:text-white mt-1">{sortedTasks.length} task{sortedTasks.length === 1 ? '' : 's'}</h2>
            <p className="text-sm text-gray-500 dark:text-[var(--text-secondary)] mt-1">Chronological view of everything queued for this project.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80">To Do · {statusSummary.todo}</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100">In Progress · {statusSummary.inProgress}</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-100">On Hold · {statusSummary.hold}</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-100">Done · {statusSummary.done}</span>
          </div>
        </div>

        {sortedTasks.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-[var(--border-color)]">
            {sortedTasks.map((task) => (
              <TaskRow key={task._id || task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="p-16 text-center bg-gradient-to-b from-white to-gray-50 dark:from-transparent dark:to-black/30">
            <Circle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-white/10" />
            <p className="text-gray-500 dark:text-[var(--text-secondary)] font-medium">No tasks in the backlog yet.</p>
            {canAddTasks ? (
              <p className="text-xs text-gray-400 dark:text-[var(--text-secondary)]/70 mt-1">Use "Add Task" to create the first work item.</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-[var(--text-secondary)]/70 mt-1">Ask an admin to add tasks.</p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {canManageTasks && (
        <TaskModal 
          isOpen={showTaskModal}
          onClose={handleCloseModal}
          task={editingTask}
          projectId={id}
        />
      )}

    </div>
  );
};

export default Backlog;

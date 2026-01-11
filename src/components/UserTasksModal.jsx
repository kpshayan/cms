import { X, CheckCircle2, Clock, Circle, Edit2, ArrowRight } from 'lucide-react';

const normalizeIdentifier = (value) => String(value ?? '').trim().toLowerCase();

const doesTaskBelongToUser = (task, user) => {
  if (!task || !user) return false;
  const candidate = task.assignee;
  if (!candidate) return false;

  const userIdentifiers = [
    user._id,
    user.id,
    user.username,
    user.executorUsername,
    user.email,
    user.name,
  ].map(normalizeIdentifier).filter(Boolean);
  if (!userIdentifiers.length) return false;

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    return userIdentifiers.includes(normalizeIdentifier(candidate));
  }

  const assigneeIdentifiers = [
    candidate._id,
    candidate.id,
    candidate.username,
    candidate.executorUsername,
    candidate.email,
    candidate.name,
  ].map(normalizeIdentifier).filter(Boolean);

  return assigneeIdentifiers.some((identifier) => userIdentifiers.includes(identifier));
};

const getTaskId = (task) => task?._id || task?.id;

const UserTasksModal = ({ isOpen, onClose, user, tasks, onEditTask, canEditTasks = false }) => {
  if (!isOpen || !user) return null;

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const userTasks = safeTasks.filter((t) => doesTaskBelongToUser(t, user));
  const completedTasks = userTasks.filter(t => t.status === 'done');
  const inProgressTasks = userTasks.filter(t => t.status === 'in-progress');
  const todoTasks = userTasks.filter(t => t.status === 'todo');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const TaskCard = ({ task, delay }) => {
    const handleClick = () => {
      if (canEditTasks && typeof onEditTask === 'function') {
        onEditTask(task);
      }
    };

    const taskId = getTaskId(task);

    return (
    <div 
      className={`group bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-jira-blue hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:rotate-1 ${canEditTasks ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        animation: `slideInRight 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
      }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
            {getStatusIcon(task.status)}
          </div>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded font-bold group-hover:bg-jira-blue group-hover:text-white transition-all duration-300">
            {taskId}
          </span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getPriorityColor(task.priority)} transform group-hover:scale-110 transition-all duration-300`}>
          {task.priority}
        </span>
      </div>

      <h3 className="text-sm font-bold text-jira-gray mb-2 group-hover:text-jira-blue transition-colors duration-300">
        {task.title}
      </h3>

      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 group-hover:text-gray-800 transition-colors duration-300">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 group-hover:border-jira-blue transition-colors duration-300">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold transform group-hover:scale-105 transition-all duration-300 ${
          task.status === 'done' ? 'bg-green-100 text-green-700' :
          task.status === 'in-progress' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {task.status.replace('-', ' ')}
        </span>
        {canEditTasks && (
          <div className="flex items-center space-x-1 text-jira-blue opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
            <span className="text-xs font-medium">Edit</span>
            <Edit2 className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
  };

  return (
    <>
      {/* Backdrop with fade-in animation */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        style={{ 
          animation: 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9998
        }}
        onClick={onClose}
      />
      
      {/* Modal with slide and scale animation */}
      <div 
        className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div 
          className="bg-gradient-to-br from-white via-blue-50/30 to-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border-2 border-blue-100 pointer-events-auto"
          style={{ animation: 'modalSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-jira-blue to-blue-600 text-white p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32" style={{ animation: 'pulse 3s ease-in-out infinite' }}></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48" style={{ animation: 'pulse 3s ease-in-out infinite 1.5s' }}></div>
            </div>
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all duration-300 hover:rotate-180 hover:scale-110 cursor-pointer"
              style={{ zIndex: 50 }}
              aria-label="Close modal"
            >
              <X className="w-6 h-6 pointer-events-none" />
            </button>
            
            <div className="relative z-10">
              <div 
                className="flex items-center space-x-4 mb-4"
                style={{ animation: 'slideInLeft 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <div className="w-20 h-20 rounded-full bg-white text-jira-blue flex items-center justify-center font-bold text-2xl shadow-xl transform hover:scale-125 hover:rotate-12 transition-all duration-500">
                  {user.avatar}
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1 hover:scale-105 transition-transform duration-300">{user.name}</h2>
                </div>
              </div>
              
              <div 
                className="flex items-center space-x-6 mt-6"
                style={{ animation: 'slideInLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30 hover:bg-white/30 hover:scale-110 transition-all duration-300 cursor-pointer">
                  <p className="text-xs text-blue-100">Total Tasks</p>
                  <p className="text-2xl font-bold">{userTasks.length}</p>
                </div>
                <div className="bg-green-500/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-green-300/30 hover:bg-green-500/40 hover:scale-110 transition-all duration-300 cursor-pointer">
                  <p className="text-xs text-green-100">Completed</p>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                </div>
                <div className="bg-orange-500/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-orange-300/30 hover:bg-orange-500/40 hover:scale-110 transition-all duration-300 cursor-pointer">
                  <p className="text-xs text-orange-100">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                </div>
                <div className="bg-gray-500/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-300/30 hover:bg-gray-500/40 hover:scale-110 transition-all duration-300 cursor-pointer">
                  <p className="text-xs text-gray-100">To Do</p>
                  <p className="text-2xl font-bold">{todoTasks.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-280px)]">
            {userTasks.length === 0 ? (
              <div 
                className="text-center py-16"
                style={{ animation: 'fadeIn 0.5s ease-out 0.3s both' }}
              >
                <Circle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Tasks Assigned</h3>
                <p className="text-gray-500">This team member doesn't have any tasks yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* To Do Tasks */}
                {todoTasks.length > 0 && (
                  <div>
                    <h3 
                      className="text-lg font-bold text-gray-700 mb-4 flex items-center"
                      style={{ animation: 'slideInLeft 0.5s ease-out 0.2s both' }}
                    >
                      <Circle className="w-5 h-5 mr-2 text-gray-500" />
                      To Do ({todoTasks.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {todoTasks.map((task, index) => (
                        <TaskCard key={getTaskId(task)} task={task} delay={0.1 * index + 0.3} />
                      ))}
                    </div>
                  </div>
                )}

                {/* In Progress Tasks */}
                {inProgressTasks.length > 0 && (
                  <div>
                    <h3 
                      className="text-lg font-bold text-gray-700 mb-4 flex items-center"
                      style={{ animation: 'slideInLeft 0.5s ease-out 0.3s both' }}
                    >
                      <Clock className="w-5 h-5 mr-2 text-orange-600" />
                      In Progress ({inProgressTasks.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inProgressTasks.map((task, index) => (
                        <TaskCard key={getTaskId(task)} task={task} delay={0.1 * index + 0.4} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div>
                    <h3 
                      className="text-lg font-bold text-gray-700 mb-4 flex items-center"
                      style={{ animation: 'slideInLeft 0.5s ease-out 0.4s both' }}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                      Completed ({completedTasks.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {completedTasks.map((task, index) => (
                        <TaskCard key={getTaskId(task)} task={task} delay={0.1 * index + 0.5} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default UserTasksModal;

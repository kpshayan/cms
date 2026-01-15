import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Activity,
  Plus,
  UserPlus,
  Trash2,
  FileText,
  Send
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import TaskModal from '../components/TaskModal';
import UserModal from '../components/UserModal';
import UserTasksModal from '../components/UserTasksModal';

const Summary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    getProjectById, 
    getTasksByProject,
    updateProject,
    addProjectComment,
    deleteProjectComment,
    addProjectMember,
    removeProjectMember,
    updateTask,
    getQuotationsForProject,
    loadQuotationsForProject,
    fetchQuotationsPdf,
    fetchQuotationVersionPdf,
  } = useData();
  const {
    hasPermission,
    user: authUser,
  } = useAuth();
  const isAdminOne = authUser?.role === 'FULL_ACCESS';
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserTasksModal, setShowUserTasksModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [userModalError, setUserModalError] = useState('');
  
  const project = getProjectById(id);
  const tasks = getTasksByProject(id);
  const canAddTasks = hasPermission('manageTasks');
  const canManageTasks = hasPermission('manageTasks');
  const canManageTeam = (hasPermission('manageProjects') || hasPermission('manageTeamMembers')) && !authUser?.isExecutor;
  const canEditProjectDescription = hasPermission('manageProjects') && !authUser?.isExecutor;
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [showAllQuotationVersions, setShowAllQuotationVersions] = useState(false);
  const [summaryCommentText, setSummaryCommentText] = useState('');
  const [submittingSummaryComment, setSubmittingSummaryComment] = useState(false);
  const [deletingSummaryCommentId, setDeletingSummaryCommentId] = useState(null);

  const quotationsSnapshotRef = useRef(null);
  const handledScrollRef = useRef(false);

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const holdTasks = tasks.filter(t => t.status === 'hold').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const projectId = project?._id || project?.id;
  const teamMembers = project?.team || [];
  const summaryComments = Array.isArray(project?.summaryComments) ? project.summaryComments : [];
  const quotations = getQuotationsForProject(id);
  const quotationEntries = quotations?.entries || [];
  const hasQuotations = quotationEntries.length > 0;

  const quotationDetails = project?.quotationDetails || {};
  const quotationDetailsFinalized = Boolean(project?.quotationDetailsFinalized);
  const hasQuotationDetails = quotationDetailsFinalized && [
    quotationDetails.name,
    quotationDetails.production,
    quotationDetails.project,
    quotationDetails.type,
    quotationDetails.producer,
    quotationDetails.contact,
  ].some((value) => String(value || '').trim());

  const showDetailsPanel = hasQuotationDetails;
  const showSnapshotPanel = isAdminOne && hasQuotations;
  const topPanelsCols = showDetailsPanel && showSnapshotPanel ? 'lg:grid-cols-2' : 'lg:grid-cols-1';

  const quotationVersions = Array.isArray(project?.quotationVersions) ? project.quotationVersions : [];
  const sortedQuotationVersions = quotationVersions
    .slice()
    .sort((a, b) => {
      const aTime = a?.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bTime = b?.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bTime - aTime;
    });
  const olderQuotationVersions = sortedQuotationVersions.length > 1
    ? sortedQuotationVersions.slice(1)
    : [];

  const visibleOlderQuotationVersions = showAllQuotationVersions
    ? olderQuotationVersions
    : olderQuotationVersions.slice(0, 2);

  useEffect(() => {
    if (!project) return;
    if (isEditingDescription) return;
    setDescriptionDraft(project?.description || '');
  }, [project, isEditingDescription]);

  useEffect(() => {
    if (!projectId || !isAdminOne) return;
    loadQuotationsForProject(projectId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isAdminOne]);

  useEffect(() => {
    if (handledScrollRef.current) return;
    const target = location?.state?.scrollTo;
    if (target !== 'quotationsSnapshot') return;

    handledScrollRef.current = true;
    requestAnimationFrame(() => {
      if (quotationsSnapshotRef.current) {
        quotationsSnapshotRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      navigate(`${location.pathname}${location.search}${location.hash}`, {
        replace: true,
        state: {},
      });
    });
  }, [location, navigate]);

  const ensureQuotationsBlob = async () => {
    if (quotations?.pdfBlob) {
      return quotations.pdfBlob;
    }
    if (!projectId) return null;
    try {
      const blob = await fetchQuotationsPdf(projectId);
      return blob;
    } catch (err) {
      console.error('Unable to fetch quotations PDF', err);
      return null;
    }
  };

  const handleViewPdf = async () => {
    const blob = await ensureQuotationsBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
  };

  const handleDownloadPdf = async () => {
    const blob = await ensureQuotationsBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = quotations?.pdfName || 'Quotations.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
  };

  const openBlobInNewTab = (blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
  };

  const downloadBlob = (blob, filename) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'Quotations.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
  };

  const handleViewOldVersion = async (version) => {
    if (!projectId || !version?.id) return;
    const blob = await fetchQuotationVersionPdf(projectId, version.id);
    openBlobInNewTab(blob);
  };

  const handleDownloadOldVersion = async (version) => {
    if (!projectId || !version?.id) return;
    const blob = await fetchQuotationVersionPdf(projectId, version.id);
    downloadBlob(blob, version?.pdfName || 'Quotations.pdf');
  };

  const startEditingDescription = () => {
    if (!canEditProjectDescription) return;
    setDescriptionError('');
    setDescriptionDraft(project?.description || '');
    setIsEditingDescription(true);
  };

  const cancelEditingDescription = () => {
    setDescriptionError('');
    setIsEditingDescription(false);
    setDescriptionDraft(project?.description || '');
  };

  const saveDescription = async () => {
    if (!projectId || !canEditProjectDescription) return;
    setDescriptionError('');
    setIsSavingDescription(true);
    try {
      await updateProject(projectId, { description: descriptionDraft });
      setIsEditingDescription(false);
    } catch (err) {
      setDescriptionError(err?.message || 'Unable to update description.');
    } finally {
      setIsSavingDescription(false);
    }
  };

  const normalizeIdentifier = (value) => String(value ?? '').trim().toLowerCase();

  const formatDateTime = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(value);
    }
  };

  const canPostSummaryComment = ['FULL_ACCESS', 'TASK_EDITOR', 'EXECUTOR', 'PROJECT_READ_ONLY'].includes(authUser?.role);
  const doesTaskBelongToMember = (task, member) => {
    if (!task || !member || !task.assignee) return false;
    const memberIdentifiers = [
      member._id,
      member.id,
      member.username,
      member.executorUsername,
      member.email,
      member.name,
    ].map(normalizeIdentifier).filter(Boolean);
    if (!memberIdentifiers.length) return false;
    const assigneeIdentifiers = [
      task.assignee._id,
      task.assignee.id,
      task.assignee.username,
      task.assignee.email,
      task.assignee.name,
    ].map(normalizeIdentifier).filter(Boolean);
    return assigneeIdentifiers.some((identifier) => memberIdentifiers.includes(identifier));
  };

  const handleSubmitSummaryComment = async () => {
    if (!projectId) return;
    if (!canPostSummaryComment) return;
    const text = String(summaryCommentText || '').trim();
    if (!text) return;

    try {
      setSubmittingSummaryComment(true);
      await addProjectComment(projectId, text);
      setSummaryCommentText('');
    } catch (err) {
      console.error('Failed to add project comment', err);
    } finally {
      setSubmittingSummaryComment(false);
    }
  };

  const handleDeleteSummaryComment = async (commentId) => {
    if (!projectId || !commentId) return;
    try {
      setDeletingSummaryCommentId(String(commentId));
      await deleteProjectComment(projectId, commentId);
    } catch (err) {
      console.error('Failed to delete project comment', err);
    } finally {
      setDeletingSummaryCommentId(null);
    }
  };

  const handleAddUser = async (userData) => {
    if (!projectId || !canManageTeam) return;
    setUserModalError('');
    try {
      await addProjectMember(projectId, { name: userData.name });
      setShowUserModal(false);
    } catch (err) {
      setUserModalError(err.message || 'Unable to add member.');
    }
  };

  const handleDeleteUser = (userId) => {
    if (!projectId) return;
    if (window.confirm('Are you sure you want to remove this team member?')) {
      removeProjectMember(projectId, userId);
    }
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserTasksModal(true);
  };

  const handleEditTask = (task) => {
    if (!canManageTasks) return;
    setEditingTask(task);
    setShowUserTasksModal(false);
    setShowTaskModal(true);
  };

  const handleCloseTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-jira-gray mb-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (!project) return <div>Project not found</div>;

  return (
    <div className="p-8 bg-jira-bg min-h-screen">
      {/* Header with Add Task Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-jira-gray">Project Overview</h2>
        </div>

        <div className="flex justify-start lg:justify-end">
          {canAddTasks && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center space-x-2 bg-jira-blue text-white px-6 py-3 rounded-lg hover:bg-jira-blue-light transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <StatCard
          icon={Activity}
          title="To Do"
          value={todoTasks}
          subtitle="Waiting to start"
          color="bg-gradient-to-br from-jira-blue to-jira-blue-light"
        />
        <StatCard
          icon={Clock}
          title="In Progress"
          value={inProgressTasks}
          subtitle="Currently active"
          color="bg-gradient-to-br from-orange-500 to-orange-600"
        />
        <StatCard
          icon={AlertCircle}
          title="On Hold"
          value={holdTasks}
          subtitle="Blocked or paused"
          color="bg-gradient-to-br from-gray-500 to-gray-600"
        />
        <StatCard
          icon={CheckCircle2}
          title="Done"
          value={completedTasks}
          subtitle="Finished"
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      {(showDetailsPanel || showSnapshotPanel) && (
        <div className={`grid grid-cols-1 ${topPanelsCols} gap-6 mb-8 items-stretch`}>
          {showDetailsPanel && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-jira-gray">Details</h3>
                  <p className="text-sm text-gray-500">Key quotation information for this project.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-700">
                <div className="truncate"><span className="font-semibold">Name:</span> {quotationDetails.name}</div>
                <div className="truncate"><span className="font-semibold">Type:</span> {quotationDetails.type}</div>
                <div className="truncate"><span className="font-semibold">Production:</span> {quotationDetails.production}</div>
                <div className="truncate"><span className="font-semibold">Producer:</span> {quotationDetails.producer}</div>
                <div className="truncate"><span className="font-semibold">Project:</span> {quotationDetails.project}</div>
                <div className="truncate"><span className="font-semibold">Contact:</span> {quotationDetails.contact}</div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 bg-jira-blue text-white px-6 py-3 rounded-full hover:bg-jira-blue-light transition-all duration-200 font-semibold shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Notification</span>
                </button>
              </div>
            </div>
          )}

          {showSnapshotPanel && (
            <div
              ref={quotationsSnapshotRef}
              id="quotations-snapshot"
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-jira-gray">Quotations Snapshot</h3>
                  <p className="text-sm text-gray-500">Latest inputs from the Quotations flow.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-jira-blue bg-blue-50 px-3 py-1 rounded-full">
                    {quotationEntries.length} fields
                  </span>
                  <button
                    type="button"
                    aria-label="Send quotations"
                    className="group relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-jira-blue text-white shadow-lg hover:shadow-xl hover:bg-jira-blue-light transition focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
                  >
                    <span className="absolute -inset-1 rounded-full bg-jira-blue/25 blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
                    <Send className="relative w-5 h-5 paper-plane-float group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:rotate-12 transition-transform duration-300" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {quotationEntries.map((entry) => (
                    <div
                      key={entry.key}
                      className="border border-gray-100 rounded-xl p-2 bg-gray-50/80 h-20 flex flex-col overflow-hidden"
                    >
                      <p className="text-xs uppercase tracking-wide text-gray-500">{entry.label}</p>
                      <p className="mt-1 text-sm font-semibold text-jira-gray break-words leading-snug line-clamp-2">
                        {entry.value}
                      </p>
                    </div>
                  ))}
                  {(quotations?.pdfAvailable || quotations?.pdfName) && (
                    <div className="border border-gray-100 rounded-xl p-2 bg-gray-50/80 h-20 flex flex-col overflow-hidden sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Generated PDF</p>
                      <p className="mt-1 text-xs font-semibold text-jira-gray break-words leading-snug line-clamp-2">
                        {quotations?.pdfName || 'Quotations.pdf'}
                      </p>
                      <div className="mt-auto flex items-center gap-3 text-jira-blue font-semibold text-xs">
                        <button onClick={handleViewPdf} className="hover:underline">
                          View
                        </button>
                        <button onClick={handleDownloadPdf} className="hover:underline">
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-jira-gray flex items-center">
              <FileText className="w-5 h-5 mr-2 text-jira-blue" />
              Project Description
            </h2>
            {canEditProjectDescription && !isEditingDescription && (
              <button
                type="button"
                onClick={startEditingDescription}
                className="text-sm text-jira-blue hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
              >
                Edit
              </button>
            )}
          </div>
          {isEditingDescription ? (
            <div className="space-y-3">
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-jira-blue focus:border-transparent text-gray-700"
                placeholder="Write a project description..."
                disabled={isSavingDescription}
              />
              {descriptionError && (
                <p className="text-sm text-red-500">{descriptionError}</p>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveDescription}
                  disabled={isSavingDescription}
                  className="px-4 py-2 bg-jira-blue text-white rounded-lg hover:bg-jira-blue-light transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingDescription ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditingDescription}
                  disabled={isSavingDescription}
                  className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : project?.description?.trim() ? (
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-gray-700 whitespace-pre-line">
                {project.description}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No description provided for this project.</p>
              {canEditProjectDescription && (
                <button
                  type="button"
                  onClick={startEditingDescription}
                  className="text-sm text-jira-blue hover:underline mt-2 font-semibold"
                >
                  Add description
                </button>
              )}
            </div>
          )}

          {isAdminOne && olderQuotationVersions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-jira-gray">Older Quotation Versions</h3>
                  <p className="text-sm text-gray-500">Previous PDFs (latest stays above).</p>
                </div>
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {olderQuotationVersions.length} version{olderQuotationVersions.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3">
                {visibleOlderQuotationVersions.map((version) => (
                  <div key={version.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/60">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-jira-gray truncate">{version.pdfName || 'Quotations.pdf'}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {version.generatedAt ? new Date(version.generatedAt).toLocaleString() : 'Unknown date'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-jira-blue font-semibold">
                        <button
                          type="button"
                          onClick={() => handleViewOldVersion(version)}
                          className="hover:underline"
                          disabled={!version.pdfAvailable}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadOldVersion(version)}
                          className="hover:underline"
                          disabled={!version.pdfAvailable}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {olderQuotationVersions.length > 2 && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAllQuotationVersions((prev) => !prev)}
                    className="text-sm text-jira-blue hover:underline font-semibold"
                  >
                    {showAllQuotationVersions ? 'View less' : 'View more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-jira-gray flex items-center">
                <Users className="w-5 h-5 mr-2 text-jira-blue" />
                Team Members
              </h2>
              {canManageTeam && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center space-x-1 text-sm text-jira-blue hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              )}
            </div>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm mb-3">No team members yet</p>
              {canManageTeam && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="text-sm text-jira-blue hover:underline"
                >
                  Add your first member
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {teamMembers.map((user) => {
                const memberId = user._id || user.id;
                const userTasks = tasks.filter(task => doesTaskBelongToMember(task, user));
                return (
                  <div 
                    key={memberId}
                    className="flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300 group cursor-pointer hover:shadow-md hover:scale-[1.02] transform"
                    onClick={() => handleUserClick(user)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-jira-blue to-jira-blue-light text-white flex items-center justify-center font-semibold text-sm shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                        {user.avatar || user.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-jira-gray text-sm truncate group-hover:text-jira-blue transition-colors">{user.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-jira-blue group-hover:scale-110 transition-transform">{userTasks.length}</p>
                        <p className="text-xs text-gray-500">tasks</p>
                      </div>
                      {canManageTeam && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(memberId);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-jira-gray flex items-center">
              <FileText className="w-5 h-5 mr-2 text-jira-blue" />
              Comments
            </h2>
            <span className="text-sm text-gray-500">{summaryComments.length}</span>
          </div>

          {canPostSummaryComment && (
            <div className="mb-4">
              <textarea
                value={summaryCommentText}
                onChange={(e) => setSummaryCommentText(e.target.value)}
                rows={3}
                placeholder="Write a comment..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-jira-gray placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-jira-blue/30"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitSummaryComment}
                  disabled={submittingSummaryComment || !String(summaryCommentText || '').trim()}
                  className="px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-jira-blue to-jira-blue-light text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submittingSummaryComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {summaryComments.length === 0 ? (
            <div className="text-sm text-gray-500">No comments yet.</div>
          ) : (
            <div className="space-y-3">
              {summaryComments
                .slice()
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((comment) => {
                  const authorName = comment?.author?.name || comment?.author?.username || 'Unknown';
                  const authorUsername = normalizeIdentifier(comment?.author?.username);
                  const viewerUsername = normalizeIdentifier(authUser?.username);
                  const canDelete = authUser?.role === 'FULL_ACCESS' || (authorUsername && viewerUsername && authorUsername === viewerUsername);
                  const when = formatDateTime(comment?.createdAt);
                  return (
                    <div key={comment._id || `${authorName}-${comment.createdAt}-${comment.text?.slice(0, 12)}`} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-sm font-semibold text-jira-gray truncate">{authorName}</div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-500 whitespace-nowrap">{when}</div>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSummaryComment(comment._id)}
                              disabled={deletingSummaryCommentId === String(comment._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40"
                              title="Delete comment"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap break-words">{comment.text}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        </div>
      </div>
    {/* Modals */}
    {canManageTasks && (
      <TaskModal 
        isOpen={showTaskModal}
        onClose={handleCloseTaskModal}
        task={editingTask}
        projectId={id}
      />
    )}
    
    {canManageTeam && (
      <UserModal
        isOpen={showUserModal}
        onClose={() => {
          setUserModalError('');
          setShowUserModal(false);
        }}
        onSubmit={handleAddUser}
        error={userModalError}
      />
    )}

    <UserTasksModal
      isOpen={showUserTasksModal}
      onClose={() => setShowUserTasksModal(false)}
      user={selectedUser}
      tasks={tasks}
      onEditTask={canManageTasks ? handleEditTask : null}
      canEditTasks={canManageTasks}
    />
    </div>
  );
};

export default Summary;

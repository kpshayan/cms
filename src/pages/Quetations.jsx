import { ClipboardList } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';

const Quetations = () => {
  const { id } = useParams();
  const { getProjectById } = useData();
  const project = getProjectById(id);

  if (!project) {
    return (
      <div className="p-8">
        <div className="bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-gray-200 dark:border-[var(--border-color)] p-8">
          <p className="text-center text-gray-600 dark:text-[var(--text-secondary)]">Project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-jira-bg/30 dark:bg-transparent min-h-screen">
      <div className="bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-lg border border-gray-200 dark:border-[var(--border-color)] p-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-jira-blue to-jira-blue-light flex items-center justify-center text-white shadow-xl">
          <ClipboardList className="w-10 h-10" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-jira-gray dark:text-white">
          Quetations
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-[var(--text-secondary)] max-w-2xl">
          This space will hold project-specific quotations, approvals, and pricing artifacts for <span className="font-semibold text-jira-blue dark:text-sky-300">{project.name}</span>.
          The layout is ready and waiting for your instructions.
        </p>
        <div className="mt-8 px-6 py-3 bg-blue-50 dark:bg-white/5 rounded-2xl text-sm text-jira-blue dark:text-sky-200 border border-blue-100 dark:border-white/10">
          Tell me what to surface here (tables, forms, workflows), and I will wire it up next.
        </div>
      </div>
    </div>
  );
};

export default Quetations;

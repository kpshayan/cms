import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ position = 'fixed' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${position === 'fixed' ? 'fixed bottom-6 right-6 z-50' : ''} group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/70 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg shadow-gray-200/60 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:shadow-slate-900/30`}
      aria-label={`Activate ${isDark ? 'light' : 'dark'} mode`}
      data-magnetic
    >
      {isDark ? (
        <SunMedium className="h-4 w-4 text-amber-300 transition-transform duration-300 group-hover:rotate-12" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500 transition-transform duration-300 group-hover:-rotate-12" />
      )}
      <span className="hidden sm:inline">
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
};

export default ThemeToggle;

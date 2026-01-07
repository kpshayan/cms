import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Layers, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoClick = (event) => {
    event.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-transparent/10 bg-white/90 dark:bg-[#050915]/90 shadow-[0_10px_35px_rgba(15,23,42,0.08)] dark:shadow-[0_25px_55px_rgba(1,4,13,0.75)] backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" onClick={handleLogoClick}>
            <div className="w-10 h-10 bg-gradient-to-br from-jira-blue to-jira-blue-light rounded-lg flex items-center justify-center shadow-lg shadow-jira-blue/30">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-jira-gray dark:text-white">ProjectFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <Link to="/" className="text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-300">
              Home
            </Link>
            <Link to="/features" className="text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-300">
              Features
            </Link>
            <Link to="/pricing" className="text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-300">
              Pricing
            </Link>
            <Link to="/login" className="text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-300">
              Login
            </Link>
            <Link 
              to="/signup" 
              className="bg-jira-blue text-white px-6 py-2 rounded-lg hover:bg-jira-blue-light transition-all duration-200 shadow-lg shadow-jira-blue/30 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[var(--bg-surface)]/95 backdrop-blur">
          <div className="px-4 py-3 space-y-3">
            <Link 
              to="/" 
              className="block py-2 text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/features" 
              className="block py-2 text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              to="/pricing" 
              className="block py-2 text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/login" 
              className="block py-2 text-gray-700 hover:text-jira-blue transition-colors dark:text-gray-200"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="block bg-jira-blue text-white px-6 py-2 rounded-lg hover:bg-jira-blue-light transition-colors text-center shadow-lg shadow-jira-blue/30"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ROLE_SUMMARY } from '../constants/roles';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const navigate = useNavigate();
  const { signup, resetAccount } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setCurrentAction('signup');
      const success = await signup(username, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Unable to create account. Please try again or sign in.');
      }
    } catch (err) {
      setError(err.message || 'Unable to create account.');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setStatusMessage('');
    if (!username.trim()) {
      setError('Enter the username you want to reset.');
      return;
    }

    try {
      setLoading(true);
      setCurrentAction('reset');
      await resetAccount(username);
      setStatusMessage('Saved password removed. Create a new one now.');
    } catch (err) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-[#050b17] dark:via-[#070f1e] dark:to-[#111833] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl w-full grid gap-10 lg:grid-cols-2 items-start">
        <div>
          <div className="text-center lg:text-left mb-8">
            <Link to="/" className="inline-flex items-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-jira-blue to-jira-blue-light rounded-xl flex items-center justify-center">
                <Layers className="w-7 h-7 text-white" />
              </div>
              <span className="font-bold text-2xl text-jira-gray dark:text-white">ProjectFlow</span>
            </Link>
            <h1 className="text-3xl font-bold text-jira-gray dark:text-white mb-3">Sign up for access</h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-lg">
              Use admin1, admin2, admin4, or the admin3-* username that admin1 created for you. Roles are assigned automatically and every password is hashed before storage.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 space-y-6 dark:bg-[var(--bg-surface)] dark:shadow-[0_20px_60px_rgba(2,6,23,0.65)] border border-transparent dark:border-white/10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm dark:bg-red-500/10 dark:border-red-400/40 dark:text-red-200">
                  {error}
                </div>
              )}

              {statusMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm dark:bg-emerald-500/10 dark:border-emerald-400/40 dark:text-emerald-200">
                  {statusMessage}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent transition-all disabled:opacity-50 bg-white dark:bg-[#10182c] dark:border-white/10 dark:text-gray-100"
                    placeholder="admin1"
                    autoComplete="username"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
                  Admin1/admin2/admin4 are static. Admin3 teammates must use the exact admin3-* username provisioned by admin1.
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent transition-all disabled:opacity-50 bg-white dark:bg-[#10182c] dark:border-white/10 dark:text-gray-100"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jira-blue focus:border-transparent transition-all disabled:opacity-50 bg-white dark:bg-[#10182c] dark:border-white/10 dark:text-gray-100"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-jira-blue to-jira-blue-light text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (currentAction === 'reset' ? 'Resetting...' : 'Creating account...') : 'Create account'}
              </button>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full text-sm font-semibold text-jira-blue hover:text-jira-blue-light transition disabled:opacity-50"
              >
                {currentAction === 'reset' ? 'Resetting...' : 'Remove saved password for this username'}
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Use this if you forgot the password you previously set.
              </p>

              <p className="text-sm text-center text-gray-600 dark:text-gray-300">
                Already configured? <Link to="/login" className="font-semibold text-jira-blue hover:text-jira-blue-light">Sign in</Link>
              </p>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white dark:border-white/10 dark:from-white/5 dark:to-white/0">
            <p className="text-lg font-semibold text-jira-gray dark:text-white mb-2">Role overview</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Permissions stay tied to each username. Once signed up, the system automatically applies the correct access level.
            </p>
          </div>

          <div className="grid gap-4">
            {ROLE_SUMMARY.map((role) => (
              <div key={role.username} className="p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                <p className="text-base font-semibold text-gray-900 dark:text-white">{role.username}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-jira-blue dark:text-blue-200">
                  {role.role.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{role.summary}</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">Scope: {role.scope}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

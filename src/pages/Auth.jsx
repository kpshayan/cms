import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Layers, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const normalizeMode = (value) => {
  const raw = String(value || '').toLowerCase();
  if (raw === 'signup' || raw === 'sign-up') return 'signup';
  return 'signin';
};

const Auth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const initialMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('mode');
    if (fromQuery) return normalizeMode(fromQuery);
    if (location.pathname === '/signup') return 'signup';
    return 'signin';
  }, [location.pathname, location.search]);

  const [mode, setMode] = useState(initialMode);
  const isSignIn = mode === 'signin';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchTo = (next) => {
    const normalized = normalizeMode(next);
    setMode(normalized);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    navigate(`/auth?mode=${normalized}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignIn) {
      const ok = await login(username, password);
      if (ok) navigate('/dashboard');
      return;
    }

    if (password !== confirmPassword) {
      return;
    }

    const ok = await signup(username, password);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[980px]">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jira-blue to-jira-blue-light flex items-center justify-center shadow-sm">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-jira-gray dark:text-gray-100">ProjectFlow</span>
          </Link>
        </div>

        <div className="relative w-full bg-white dark:bg-[var(--bg-surface)] rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[560px]">
            {/* Left: Sign In form */}
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-jira-gray dark:text-gray-100">Welcome back</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Sign in to your account to continue</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" autoComplete="off">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your username"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-muted)] text-jira-gray dark:text-gray-100 focus:ring-2 focus:ring-jira-blue/30 focus:border-jira-blue/40 outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Only usernames added to the access list can sign in. If you cannot sign in, ask an admin to add your name.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-muted)] text-jira-gray dark:text-gray-100 focus:ring-2 focus:ring-jira-blue/30 focus:border-jira-blue/40 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full py-3 font-semibold text-white bg-gradient-to-r from-jira-blue to-jira-blue-light hover:shadow-lg active:scale-[0.99] transition flex items-center justify-center gap-2"
                >
                  <span>Sign In</span>
                  <span aria-hidden>→</span>
                </button>

                <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                  Need an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTo('signup')}
                    className="font-semibold text-jira-blue hover:text-jira-blue-light transition"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Sign Up form */}
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-jira-gray dark:text-gray-100">Create your account</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Sign up to get access</p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5" autoComplete="off">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin1"
                      className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-muted)] text-jira-gray dark:text-gray-100 focus:ring-2 focus:ring-jira-blue/30 focus:border-jira-blue/40 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-muted)] text-jira-gray dark:text-gray-100 focus:ring-2 focus:ring-jira-blue/30 focus:border-jira-blue/40 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-muted)] text-jira-gray dark:text-gray-100 focus:ring-2 focus:ring-jira-blue/30 focus:border-jira-blue/40 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-100 transition" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full py-3 font-semibold text-white bg-gradient-to-r from-jira-blue to-jira-blue-light hover:shadow-lg active:scale-[0.99] transition"
                >
                  Create account
                </button>

                <button
                  type="button"
                  className="w-full text-sm font-semibold text-jira-blue hover:text-jira-blue-light transition"
                >
                  Reset password
                </button>

                <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                  Already configured?{' '}
                  <button
                    type="button"
                    onClick={() => switchTo('signin')}
                    className="font-semibold text-jira-blue hover:text-jira-blue-light transition"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sliding blue panel (overlay) */}
          <div
            className={
              `hidden md:block absolute top-0 left-0 h-full w-1/2 `
              + `bg-gradient-to-br from-jira-blue to-jira-blue-light text-white `
              + `transition-transform duration-500 ease-in-out `
              + (isSignIn ? 'translate-x-full' : 'translate-x-0')
            }
          >
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
              <h3 className="text-3xl font-bold">{isSignIn ? 'Create Account' : 'Welcome Back!'}</h3>
              <p className="mt-3 text-sm text-white/90 max-w-xs">
                {isSignIn
                  ? 'Use your assigned username to set a password.'
                  : 'Sign in to continue to your workspace.'}
              </p>

              <button
                type="button"
                onClick={() => switchTo(isSignIn ? 'signup' : 'signin')}
                className="mt-8 px-10 py-3 rounded-full border border-white/60 text-white font-semibold tracking-wide hover:bg-white/10 active:scale-[0.99] transition"
              >
                {isSignIn ? 'SIGN UP' : 'SIGN IN'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

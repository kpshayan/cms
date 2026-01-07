export { AuthProvider, useAuth } from './authBackend.jsx';

/* Legacy offline-only implementation retained for reference.
import { createContext, useState, useContext, useEffect } from 'react';
import { ROLE_DEFINITIONS, EXECUTOR_ROLE_BLUEPRINT } from '../constants/roles';

const AuthContext = createContext(null);

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';
const PASSWORD_STORAGE_KEY = 'projectflow-role-passwords-v1';
const EXECUTOR_STORAGE_KEY = 'projectflow-executor-accounts-v1';
const EXECUTOR_USERNAME_PREFIX = 'admin3-';
const isBrowser = typeof window !== 'undefined';

const normalizeUsername = (value = '') => value.trim().toLowerCase();
const isSha256Hash = (value = '') => /^[a-f0-9]{64}$/i.test(value);

const hashPassword = async (password = '') => {
  const safePassword = password ?? '';
  if (!safePassword) return '';

  if (!isBrowser || !window.crypto?.subtle || typeof TextEncoder === 'undefined') {
    if (typeof btoa === 'function') {
      return btoa(safePassword);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(safePassword).toString('base64');
    }
    return safePassword.split('').reverse().join('');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(safePassword);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const readPasswordStore = () => {
  if (!isBrowser) {
    return {};
  }

  try {
    const raw = localStorage.getItem(PASSWORD_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const readExecutorStore = () => {
  if (!isBrowser) {
    return [];
  }
  try {
    const raw = localStorage.getItem(EXECUTOR_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildAvatarFromName = (name = '', providedAvatar = '') => {
  if (providedAvatar?.trim()) {
    return providedAvatar.trim().slice(0, 2).toUpperCase();
  }
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return initials || 'EX';
};

const buildUserPayload = (username, profile) => ({
  id: username,
  username,
  name: profile.displayName,
  email: profile.email,
  role: profile.role,
  scope: profile.scope,
  avatar: profile.avatar,
  permissions: profile.permissions,
});

const buildExecutorPayload = (account) => ({
  id: account.username,
  username: account.username,
  name: account.name,
  email: account.email,
  role: EXECUTOR_ROLE_BLUEPRINT.role,
  scope: EXECUTOR_ROLE_BLUEPRINT.scope,
  avatar: account.avatar,
  permissions: { ...(account.permissions || EXECUTOR_ROLE_BLUEPRINT.permissions) },
  isExecutor: true,
});

const simulateNetworkDelay = () => new Promise((resolve) => setTimeout(resolve, 300));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rolePasswords, setRolePasswords] = useState(() => readPasswordStore());
  const [executors, setExecutors] = useState(() => readExecutorStore());

  const persistRolePasswords = (updater) => {
    setRolePasswords((prev) => {
      const nextPasswords = typeof updater === 'function' ? updater(prev) : updater;
      if (isBrowser) {
        localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(nextPasswords));
      }
      return nextPasswords;
    });
  };

  const persistExecutors = (updater) => {
    setExecutors((prev) => {
      const nextExecutors = typeof updater === 'function' ? updater(prev) : updater;
      if (isBrowser) {
        localStorage.setItem(EXECUTOR_STORAGE_KEY, JSON.stringify(nextExecutors));
      }
      return nextExecutors;
    });
  };

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedToken && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const migratePasswords = async () => {
      const stored = readPasswordStore();
      const next = { ...stored };
      let mutated = false;
      for (const [username, password] of Object.entries(stored)) {
        if (!password || isSha256Hash(password)) continue;
        next[username] = await hashPassword(password);
        mutated = true;
      }
      if (!cancelled && mutated) {
        setRolePasswords(next);
        if (isBrowser) {
          localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(next));
        }
      }
    };
    migratePasswords();
    return () => {
      cancelled = true;
    };
  }, []);

  const getExecutorByUsername = (username) => (
    executors.find((account) => normalizeUsername(account.username) === normalizeUsername(username))
  );

  const generateNextExecutorUsername = () => {
    const suffixes = executors
      .map((account) => {
        const raw = normalizeUsername(account.username).replace(EXECUTOR_USERNAME_PREFIX, '');
        const numeric = parseInt(raw, 10);
        return Number.isFinite(numeric) ? numeric : null;
      })
      .filter((value) => value !== null);
    const nextIndex = suffixes.length ? Math.max(...suffixes) + 1 : 1;
    return `${EXECUTOR_USERNAME_PREFIX}${nextIndex}`;
  };

  const ensureAdminControl = () => {
    if (normalizeUsername(user?.username) !== 'admin1') {
      throw new Error('Only admin1 can manage executor accounts.');
    }
  };

  const login = async (username, password) => {
    try {
      setError(null);
      await simulateNetworkDelay();
      const normalizedUsername = normalizeUsername(username || '');
      const profile = ROLE_DEFINITIONS[normalizedUsername];
      const executorAccount = getExecutorByUsername(normalizedUsername);

      if (!profile && !executorAccount) {
        throw new Error('Unknown username. Ask admin1 to provision an admin3-* account.');
      }

      if (!password) {
        throw new Error('Password is required.');
      }

      const incomingHash = await hashPassword(password);
      let authUser = null;

      if (profile) {
        const storedPassword = rolePasswords[normalizedUsername];
        if (!storedPassword) {
          throw new Error('Account not configured yet. Sign up to set a password.');
        }
        let referenceHash = storedPassword;
        if (!isSha256Hash(storedPassword)) {
          referenceHash = await hashPassword(storedPassword);
          persistRolePasswords((prev) => ({
            ...prev,
            [normalizedUsername]: referenceHash,
          }));
        }
        if (referenceHash !== incomingHash) {
          throw new Error('Invalid username or password');
        }
        authUser = buildUserPayload(normalizedUsername, profile);
      } else if (executorAccount) {
        if (!executorAccount.passwordHash) {
          throw new Error('Password not set yet. Complete signup first.');
        }
        if (executorAccount.passwordHash !== incomingHash) {
          throw new Error('Invalid username or password');
        }
        authUser = buildExecutorPayload(executorAccount);
      }

      const sessionToken = `${normalizedUsername}-${Date.now()}`;

      localStorage.setItem(TOKEN_STORAGE_KEY, sessionToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const signup = async (username, password) => {
    try {
      setError(null);
      await simulateNetworkDelay();
      const normalizedUsername = normalizeUsername(username || '');
      const profile = ROLE_DEFINITIONS[normalizedUsername];
      const executorAccount = getExecutorByUsername(normalizedUsername);

      if (!profile && !executorAccount) {
        throw new Error('Only admin1, admin2, admin4, or provisioned admin3-* accounts can sign up.');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const hashedPassword = await hashPassword(password);
      let authUser = null;

      if (profile) {
        if (rolePasswords[normalizedUsername]) {
          throw new Error('Account already configured. Please sign in instead.');
        }
        persistRolePasswords((prev) => ({
          ...prev,
          [normalizedUsername]: hashedPassword,
        }));
        authUser = buildUserPayload(normalizedUsername, profile);
      } else if (executorAccount) {
        if (executorAccount.passwordHash) {
          throw new Error('Password already set. Please sign in.');
        }
        const enhancedAccount = {
          ...executorAccount,
          passwordHash: hashedPassword,
          updatedAt: new Date().toISOString(),
        };
        persistExecutors((prev) => prev.map((account) => (
          normalizeUsername(account.username) === normalizedUsername ? enhancedAccount : account
        )));
        authUser = buildExecutorPayload(enhancedAccount);
      }

      const sessionToken = `${normalizedUsername}-${Date.now()}`;

      localStorage.setItem(TOKEN_STORAGE_KEY, sessionToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
      setUser(authUser);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setError(null);
  };

  const resetAccount = async (username) => {
    try {
      setError(null);
      await simulateNetworkDelay();
      const normalizedUsername = normalizeUsername(username || '');
      const profile = ROLE_DEFINITIONS[normalizedUsername];

      if (!profile) {
        throw new Error('Unknown username. Try admin1, admin2, or admin4.');
      }

      if (!rolePasswords[normalizedUsername]) {
        throw new Error('No password is stored for this account yet.');
      }

      const nextPasswords = { ...rolePasswords };
      delete nextPasswords[normalizedUsername];
      persistRolePasswords(nextPasswords);

      if (user?.username === normalizedUsername) {
        logout();
      }

      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const registerExecutorAccount = async ({ name, email, username }) => {
    try {
      setError(null);
      ensureAdminControl();
      await simulateNetworkDelay();
      const trimmedName = (name || '').trim();
      if (!trimmedName) {
        throw new Error('Executor name is required.');
      }
      const requestedUsername = (username || '').trim().toLowerCase();
      const finalUsername = requestedUsername
        ? requestedUsername
        : generateNextExecutorUsername();

      if (!finalUsername.startsWith(EXECUTOR_USERNAME_PREFIX)) {
        throw new Error(`Executor username must start with "${EXECUTOR_USERNAME_PREFIX}".`);
      }

      if (getExecutorByUsername(finalUsername)) {
        throw new Error('Executor username already exists.');
      }

      const normalizedEmail = (email || `${finalUsername}@projectflow.io`).trim().toLowerCase();
      const now = new Date().toISOString();
      const newExecutor = {
        username: finalUsername,
        name: trimmedName,
        email: normalizedEmail,
        avatar: buildAvatarFromName(trimmedName),
        passwordHash: null,
        permissions: { ...EXECUTOR_ROLE_BLUEPRINT.permissions },
        createdAt: now,
        updatedAt: now,
      };
      persistExecutors((prev) => [...prev, newExecutor]);
      return newExecutor;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetExecutorPassword = async (username) => {
    try {
      setError(null);
      ensureAdminControl();
      await simulateNetworkDelay();
      const normalizedUsername = normalizeUsername(username || '');
      if (!normalizedUsername) {
        throw new Error('Executor username is required.');
      }
      if (!normalizedUsername.startsWith(EXECUTOR_USERNAME_PREFIX)) {
        throw new Error('Only admin3-* accounts can be reset here.');
      }
      const target = getExecutorByUsername(normalizedUsername);
      if (!target) {
        throw new Error('Executor account not found.');
      }
      const updated = { ...target, passwordHash: null, updatedAt: new Date().toISOString() };
      persistExecutors((prev) => prev.map((executor) => (
        normalizeUsername(executor.username) === normalizedUsername ? updated : executor
      )));
      if (user?.username === normalizedUsername) {
        logout();
      }
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeExecutorAccount = async (username) => {
    try {
      setError(null);
      ensureAdminControl();
      await simulateNetworkDelay();
      const normalizedUsername = normalizeUsername(username || '');
      if (!normalizedUsername) {
        throw new Error('Executor username is required.');
      }
      const target = getExecutorByUsername(normalizedUsername);
      if (!target) {
        throw new Error('Executor account not found.');
      }
      persistExecutors((prev) => prev.filter((executor) => normalizeUsername(executor.username) !== normalizedUsername));
      if (user?.username === normalizedUsername) {
        logout();
      }
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const hasPermission = (permissionKey) => Boolean(user?.permissions?.[permissionKey]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      resetAccount,
      loading,
      error,
      hasPermission,
      executors,
      registerExecutorAccount,
      resetExecutorPassword,
      removeExecutorAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

*/

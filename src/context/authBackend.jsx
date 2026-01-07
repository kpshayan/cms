import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executors, setExecutors] = useState([]);

  const loadExecutors = useCallback(async () => {
    try {
      const data = await authAPI.getExecutors();
      setExecutors(data.executors || []);
    } catch (err) {
      console.warn('Failed to load executor accounts', err);
    }
  }, []);

  const bootstrapSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authAPI.getMe();
      setUser(data.user);
      await loadExecutors();
    } catch (err) {
      setUser(null);
      if (err?.message && err.message !== 'Failed to fetch') {
        console.warn('Session check failed', err);
      }
    } finally {
      setLoading(false);
    }
  }, [loadExecutors]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const login = async (username, password) => {
    try {
      setError(null);
      const data = await authAPI.login({ username, password });
      setUser(data.user);
      await loadExecutors();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const signup = async (username, password) => {
    try {
      setError(null);
      const data = await authAPI.signup({ username, password });
      setUser(data.user);
      await loadExecutors();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    authAPI.logout().catch((err) => {
      console.warn('Failed to call logout endpoint', err);
    });
    setUser(null);
    setExecutors([]);
    setError(null);
  };

  const resetAccount = async (username) => {
    try {
      setError(null);
      await authAPI.resetAccount(username);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const ensureAdmin1 = () => {
    if (user?.username !== 'admin1') {
      const err = new Error('Only admin1 can manage executor accounts.');
      setError(err.message);
      throw err;
    }
  };

  const registerExecutorAccount = async ({ name, email, username }) => {
    ensureAdmin1();
    try {
      setError(null);
      const { executor } = await authAPI.createExecutor({ name, email, username });
      setExecutors((prev) => [...prev, executor]);
      return executor;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetExecutorPassword = async (executorUsername) => {
    ensureAdmin1();
    try {
      setError(null);
      const { executor } = await authAPI.resetExecutorPassword(executorUsername);
      setExecutors((prev) => prev.map((item) => (
        item.username === executor.username ? executor : item
      )));
      return executor;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeExecutorAccount = async (executorUsername) => {
    ensureAdmin1();
    try {
      setError(null);
      await authAPI.deleteExecutor(executorUsername);
      setExecutors((prev) => prev.filter((item) => item.username !== executorUsername));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const hasPermission = useCallback((permissionKey) => Boolean(user?.permissions?.[permissionKey]), [user]);

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

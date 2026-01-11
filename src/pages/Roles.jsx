import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const normalizeUsername = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const ROLES = [
  { key: 'owner', title: 'Owner' },
  { key: 'administrator', title: 'Administrator' },
  { key: 'write', title: 'Write' },
  { key: 'read', title: 'Read' },
];

const ROLE_TITLE_BY_KEY = {
  owner: 'Owner',
  administrator: 'Administrator',
  write: 'Write',
  read: 'Read',
};

const Roles = () => {
  const { user, loadRoles, assignRole } = useAuth();
  const isOwner = user?.role === 'FULL_ACCESS';

  const [roles, setRoles] = useState({ owner: [], administrator: [], write: [], read: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inputs, setInputs] = useState({ owner: '', administrator: '', write: '', read: '' });
  const [editingUsername, setEditingUsername] = useState('');

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!isOwner) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const next = await loadRoles();
        if (mounted && next) {
          setRoles({
            owner: next.owner || [],
            administrator: next.administrator || [],
            write: next.write || [],
            read: next.read || [],
          });
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Failed to load roles');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [isOwner, loadRoles]);

  const allUsernames = useMemo(() => {
    const flat = [...(roles.owner || []), ...(roles.administrator || []), ...(roles.write || []), ...(roles.read || [])];
    return flat.map(normalizeUsername).filter(Boolean);
  }, [roles]);

  const handleAdd = async (roleKey) => {
    const raw = inputs[roleKey];
    const username = normalizeUsername(raw);

    if (!username) {
      setError('Username is required.');
      return;
    }

    if (allUsernames.includes(username)) {
      setError('This username is already assigned a role.');
      return;
    }

    try {
      setError('');
      const next = await assignRole({ username, role: roleKey });
      applyRolesFromResponse(next);
      setInputs((prev) => ({ ...prev, [roleKey]: '' }));
    } catch (err) {
      setError(err?.message || 'Failed to assign role');
    }
  };

  const applyRolesFromResponse = (next) => {
    setRoles({
      owner: next.owner || [],
      administrator: next.administrator || [],
      write: next.write || [],
      read: next.read || [],
    });
  };

  const handleMove = async (username, targetRoleKey) => {
    try {
      setError('');
      const next = await assignRole({ username, role: targetRoleKey });
      applyRolesFromResponse(next);
      setEditingUsername('');
    } catch (err) {
      setError(err?.message || 'Failed to move user');
    }
  };

  const handleRemove = async (username) => {
    try {
      setError('');
      const next = await assignRole({ username, role: 'none' });
      applyRolesFromResponse(next);
      setEditingUsername('');
    } catch (err) {
      setError(err?.message || 'Failed to remove user');
    }
  };

  if (!isOwner) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-jira-gray dark:text-gray-100">Roles</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Only Owner (admin1) can manage role assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-jira-gray dark:text-gray-100">Roles</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Assign each username to exactly one role.</p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map((r) => (
              <div key={r.key} className="rounded-xl border border-blue-100 dark:border-white/10 bg-white dark:bg-[var(--bg-surface)] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-jira-gray dark:text-gray-100">{r.title}</h2>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{(roles[r.key] || []).length}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={inputs[r.key]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [r.key]: e.target.value }))}
                    placeholder="username"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[var(--bg-surface)] text-sm text-jira-gray dark:text-gray-100 outline-none focus:ring-2 focus:ring-jira-blue/30"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdd(r.key)}
                    className="px-3 py-2 rounded-lg bg-jira-blue text-white text-sm font-semibold hover:bg-jira-blue-light transition"
                  >
                    Add
                  </button>
                </div>

                <div className="mt-3 space-y-1">
                  {(roles[r.key] || []).length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">No users</div>
                  ) : (
                    (roles[r.key] || [])
                      .slice()
                      .sort((a, b) => normalizeUsername(a).localeCompare(normalizeUsername(b)))
                      .map((u) => (
                        <div key={u} className="py-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm text-jira-gray dark:text-gray-200 truncate">{u}</div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {normalizeUsername(editingUsername) === normalizeUsername(u) ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingUsername('')}
                                    className="px-2 py-1 rounded-md text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                                  >
                                    Done
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingUsername(normalizeUsername(u))}
                                  className="px-2 py-1 rounded-md text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>

                          {normalizeUsername(editingUsername) === normalizeUsername(u) && (
                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              {ROLES.filter((x) => x.key !== r.key).map((x) => (
                                <button
                                  key={`${u}-${x.key}`}
                                  type="button"
                                  onClick={() => handleMove(normalizeUsername(u), x.key)}
                                  className="px-2 py-1 rounded-md text-xs font-semibold border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
                                  title={`Move to ${ROLE_TITLE_BY_KEY[x.key]}`}
                                >
                                  Move to {ROLE_TITLE_BY_KEY[x.key]}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => handleRemove(normalizeUsername(u))}
                                className="px-2 py-1 rounded-md text-xs font-semibold border border-red-200 dark:border-red-400/30 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                title="Remove"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Roles;

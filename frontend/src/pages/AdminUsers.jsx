import React, { useEffect, useState } from 'react';
import { getAdminUsers } from '../api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminUsers();
      setUsers(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <button onClick={loadUsers} className="px-3 py-2 bg-blue-600 text-white rounded">
          Refresh
        </button>
      </div>
      {error ? <div className="mb-3 text-sm text-rose-600">{error}</div> : null}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Username</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-b last:border-b-0">
                <td className="p-3">{u.name || '-'}</td>
                <td className="p-3">{u.username || '-'}</td>
                <td className="p-3">{u.email || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                    {u.role || 'user'}
                  </span>
                </td>
              </tr>
            ))}
            {!users.length ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  No users found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

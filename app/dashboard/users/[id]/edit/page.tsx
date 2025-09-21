"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ACTIONS, RESOURCE_CATALOG, type Action } from '@/lib/permissions';

type Role = 'ADMIN' | 'MANAGER';

function Matrix({
  value,
  onChange,
  disabled,
}: {
  value: Record<string, Action[]>;
  onChange: (v: Record<string, Action[]>) => void;
  disabled?: boolean;
}) {
  const toggle = (key: string, action: Action) => {
    const current = value[key] || [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];
    onChange({ ...value, [key]: next });
  };
  return (
    <div className="overflow-auto border rounded-lg">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left text-xs font-semibold text-gray-600 px-4 py-2">Resource</th>
            {ACTIONS.map((a) => (
              <th key={a} className="text-center text-xs font-semibold text-gray-600 px-4 py-2 capitalize">{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RESOURCE_CATALOG.map((r) => {
            const key = `${r.dept}:${r.type}`;
            const chosen = value[key] || [];
            return (
              <tr key={key} className="border-t">
                <td className="px-4 py-2 text-sm text-gray-800">{r.label}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={chosen.includes(a)}
                      onChange={() => toggle(key, a)}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MANAGER');
  const [department, setDepartment] = useState('');
  const [matrix, setMatrix] = useState<Record<string, Action[]>>({});
  const [password, setPassword] = useState('');

  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (cancelled) return;
        const u = data.user;
        setName(u.name);
        setEmail(u.email);
        setRole(u.role);
        setDepartment(u.department || '');
        const m: Record<string, Action[]> = {};
        (u.grants || []).forEach((g: { dept: string; type: string; actions: string[] }) => {
          const key = `${g.dept}:${g.type}`;
          const valid = (Array.isArray(g.actions) ? g.actions : [])
            .filter((a): a is Action => (['read','ingest','approve'] as Action[]).includes(a as Action));
          m[key] = valid;
        });
        setMatrix(m);
      } catch {
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          department,
          password: password || undefined,
          grants: isAdmin
            ? []
            : Object.entries(matrix)
                .filter(([, acts]) => acts.length > 0)
                .map(([key, acts]) => {
                  const [dept, type] = key.split(':');
                  return { dept, type, actions: acts };
                }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Update failed');
        return;
      }
      setSuccess('Saved');
      setPassword('');
    } catch {
      setError('Network error');
    }
  };

  const remove = async () => {
    if (!confirm('Delete this user?')) return;
    setError('');
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Delete failed');
        return;
      }
      router.push('/dashboard/users');
    } catch {
      setError('Network error');
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
          <button onClick={remove} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>}

        <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Compliance" />
            </div>
            <div className="flex items-center gap-3">
              <input id="isAdmin" type="checkbox" checked={isAdmin} onChange={(e) => setRole(e.target.checked ? 'ADMIN' : 'MANAGER')} />
              <label htmlFor="isAdmin" className="text-sm text-gray-700">Admin (all permissions)</label>
            </div>
          </div>

          {!isAdmin && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Permissions by Department/Type</label>
              <Matrix value={matrix} onChange={setMatrix} />
              <p className="text-xs text-gray-500">Check actions for each department/type.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to keep current" />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from 'react';
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
                      className="accent-blue-600"
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

export default function NewUserPage() {
  const [role, setRole] = useState<Role>('MANAGER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [matrix, setMatrix] = useState<Record<string, Action[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = role === 'ADMIN';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          department,
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
        setError(data.error || (Array.isArray(data.errors) ? data.errors.join(', ') : 'Failed to create user'));
        return;
      }
      setSuccess('User created successfully');
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('');
      setMatrix({});
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="light-scope min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto p-6 font-sans">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create User</h1>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>}

        <form onSubmit={submit} className="space-y-6 bg-white p-6 rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Compliance, Operations" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="accent-blue-600" checked={isAdmin} onChange={(e) => setRole(e.target.checked ? 'ADMIN' : 'MANAGER')} />
              <span className="text-sm text-gray-700">Admin (all permissions, highest priority)</span>
            </label>
            {!isAdmin && <span className="text-xs text-gray-500">Choose actions per department/type</span>}
          </div>

          {!isAdmin && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Permissions by Department/Type</label>
              <div className="bg-white rounded-lg border">
                <Matrix value={matrix} onChange={setMatrix} />
              </div>
              <p className="text-xs text-gray-500">Check actions for each department/type.</p>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">Admin role grants full access; the permission matrix is ignored.</div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

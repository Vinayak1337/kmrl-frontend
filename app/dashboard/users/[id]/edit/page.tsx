"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type Role = 'ADMIN' | 'MANAGER';

function TagsInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (vals: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
            {v}
            <button type="button" onClick={() => remove(i)} className="text-gray-500 hover:text-gray-700">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder || 'Type and press Enter'}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={add} className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Add</button>
      </div>
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<string[]>([]);
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
        setPermissions(u.permissions || []);
        setDocTypes(u.docTypes || []);
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
        body: JSON.stringify({ name, email, role, department, permissions: isAdmin ? [] : permissions, docTypes, password: password || undefined }),
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TagsInput label="Permissions" values={permissions} onChange={setPermissions} placeholder="e.g., upload, manage-users" />
              <TagsInput label="Document Types" values={docTypes} onChange={setDocTypes} placeholder="e.g., policy, audit" />
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

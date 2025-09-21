import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

export default async function PolicyWorkspacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const session = token ? verifySession(token) : null;
  const allowed = !!session && (session.role === 'ADMIN' || (session.docTypes || []).includes('policy'));
  if (!allowed) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Policy Workspace</h1>
        <p className="text-gray-700">This is a sample doc-type gated area. Only users with the &#39;policy&#39; doc type or admins can access this route.</p>
      </div>
    </div>
  );
}

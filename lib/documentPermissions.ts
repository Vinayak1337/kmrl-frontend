import type { JwtUser } from './auth';

const normalize = (value: string) => value.toLowerCase().trim().replace(/[_\s-]+/g, ' ');
export function canIngestDocument(session: JwtUser, department?: string, type?: string): boolean {
  if (session.role === 'ADMIN') return true;
  if (!department || !type) return false;
  return (session.grants || []).some(grant => normalize(grant.dept) === normalize(department) &&
    normalize(grant.type) === normalize(type) && grant.actions.includes('ingest'));
}

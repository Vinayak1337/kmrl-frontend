/** Shared by the Node routes and Edge middleware. */
export function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is required in production');
  return 'dev-secret-change-me';
}

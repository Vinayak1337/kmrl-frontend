/** These identities were publicly advertised with workspace credentials. */
export function isRetiredDemoAccount(email: string): boolean {
  return ['admin@example.com', 'manager@example.com'].includes(email.trim().toLowerCase());
}

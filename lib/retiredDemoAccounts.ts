const RECOVERED_ADMIN = 'admin@example.com';

export function isRetiredDemoAccount(email: string): boolean {
  return email.trim().toLowerCase() === 'manager@example.com';
}

/** Require sessions issued after credential recovery for the previously public administrator. */
export function needsAdminRecoverySession(email: string): boolean {
  return email.trim().toLowerCase() === RECOVERED_ADMIN;
}

export function acceptsWorkspaceSession(payload: { email?: unknown; adminRecovery?: unknown }): boolean {
  return typeof payload.email === 'string' && !isRetiredDemoAccount(payload.email) &&
    (!needsAdminRecoverySession(payload.email) || payload.adminRecovery === true);
}

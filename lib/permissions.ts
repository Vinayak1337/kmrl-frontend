// Minimal prototype permissions catalog (Discord-like matrix)
// Departments
export const DEPARTMENTS = [
  'ENGINEERING',
  'OPERATIONS',
  'PROCUREMENT',
  'HR',
  'SAFETY',
] as const;
export type Department = typeof DEPARTMENTS[number];

// Document types (subset from problem statement)
export const DOC_TYPES = [
  'MAINTENANCE',
  'INCIDENT_REPORT',
  'VENDOR_INVOICE',
  'SAFETY_CIRCULAR',
  'POLICY',
] as const;
export type DocType = typeof DOC_TYPES[number];

// Actions
export const ACTIONS = ['read', 'ingest', 'approve'] as const;
export type Action = typeof ACTIONS[number];

export type Grant = {
  dept: Department;
  type: DocType;
  actions: Action[];
};

// Predefined resource catalog for UI (department × doc types we want to expose)
export const RESOURCE_CATALOG: Array<{
  dept: Department;
  type: DocType;
  label: string;
}> = [
  { dept: 'ENGINEERING', type: 'MAINTENANCE', label: 'Engineering • Maintenance Job Cards' },
  { dept: 'ENGINEERING', type: 'INCIDENT_REPORT', label: 'Engineering • Incident Reports' },
  { dept: 'OPERATIONS', type: 'SAFETY_CIRCULAR', label: 'Operations • Safety Circulars' },
  { dept: 'PROCUREMENT', type: 'VENDOR_INVOICE', label: 'Procurement • Vendor Invoices' },
  { dept: 'HR', type: 'POLICY', label: 'HR • Policies' },
  { dept: 'SAFETY', type: 'SAFETY_CIRCULAR', label: 'Safety • Safety Circulars' },
];

export function hasAction(grants: Grant[] | undefined | null, action: Action) {
  if (!Array.isArray(grants)) return false;
  return grants.some((g) => g.actions.includes(action));
}

export function hasDocType(grants: Grant[] | undefined | null, type: DocType) {
  if (!Array.isArray(grants)) return false;
  return grants.some((g) => g.type === type && g.actions.includes('read'));
}

// Encoding helpers to store in legacy String[] permissions
export function encodeToken(dept: Department | string, type: DocType | string, action: Action | string): string {
  return `${String(dept).toUpperCase()}:${String(type).toUpperCase()}:${String(action)}`;
}

export function decodeToken(token: string): { dept: Department | string; type: DocType | string; action: Action | string } | null {
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [dept, type, action] = parts;
  return { dept, type, action };
}

export function grantsToTokens(grants: Array<{ dept?: string; type?: string; actions?: string[] }>): string[] {
  const tokens: string[] = [];
  for (const g of grants) {
    if (!g.dept || !g.type || !Array.isArray(g.actions)) continue;
    for (const a of g.actions) {
      tokens.push(encodeToken(g.dept, g.type, a));
    }
  }
  return tokens;
}

export function tokensToGrants(tokens: string[]): Grant[] {
  const map = new Map<string, Set<string>>();
  for (const t of tokens) {
    const d = decodeToken(t);
    if (!d) continue;
    const key = `${String(d.dept).toUpperCase()}:${String(d.type).toUpperCase()}`;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(String(d.action));
  }
  const grants: Grant[] = [];
  for (const [key, actions] of map.entries()) {
    const [dept, type] = key.split(':') as [Department, DocType];
    grants.push({ dept, type, actions: Array.from(actions) as Action[] });
  }
  return grants;
}

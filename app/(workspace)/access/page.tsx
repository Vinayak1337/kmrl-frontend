'use client';
import { useEffect, useState } from 'react';
import { AccessPolicy } from '@/types/docsetu';
import { getAccessPolicies } from '@/services/access';

export default function AccessPage() {
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  useEffect(() => { getAccessPolicies().then(setPolicies); }, []);
  return <div className="desk-page"><header className="page-heading"><div><p className="eyebrow">Workspace administration</p><h1>Access & permissions</h1><p>Reference policies for document visibility and publishing.</p></div><span className="muted">Read-only reference</span></header><p className="notice">These are the default team policies. Individual access depends on the permissions assigned to each account.</p><div className="policy-table"><div className="policy-row policy-labels"><span>Document type</span><span>Visible to</span><span>Publishing teams</span></div>{policies.map(policy => <section className="policy-row" key={policy.documentType}><div><h2>{policy.documentType}</h2><p>{policy.description}</p>{policy.adminOnly && <span className="due-label">Administrator only</span>}</div><div><span className="mobile-field-label">Visible to</span><p>{policy.visibleToTeams.join(' · ')}</p></div><div><span className="mobile-field-label">Publishing teams</span><p>{policy.canEditTeams?.join(' · ') || 'Not specified'}</p></div></section>)}</div></div>;
}

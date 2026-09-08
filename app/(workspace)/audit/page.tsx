'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AuditEntry } from '@/types/docsetu';
import { listAuditEntries } from '@/services/audit';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

export default function AuditPage() {
  const [entries,setEntries] = useState<AuditEntry[]>([]);
  const [loading,setLoading] = useState(true);
  const [query,setQuery] = useState('');
  const [action,setAction] = useState('All');
  const [error,setError] = useState('');
  useEffect(()=>{ listAuditEntries().then(r=>setEntries(r.entries)).catch(()=>setError('Could not load audit history. Refresh to try again.')).finally(()=>setLoading(false)); },[]);
  const filtered = entries.filter(e=>(action==='All'||e.action===action)&&[e.actorName,e.actorEmail,e.target,e.action].some(v=>v.toLowerCase().includes(query.toLowerCase())));
  const date = (value:Date) => new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  return <div className="desk-page"><header className="page-heading"><div><p className="eyebrow">Workspace records</p><h1>Audit history</h1><p>Recorded changes to documents, people, and access.</p></div><span className="muted">Activity log</span></header><div className="directory-toolbar"><label className="collection-search"><Search size={17}/><span className="sr-only">Search audit history</span><input name="audit-search" autoComplete="off" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search person, document, or activity…"/></label><label className="standalone-select"><span className="sr-only">Activity type</span><select value={action} onChange={e=>setAction(e.target.value)}><option value="All">All activities</option>{[...new Set(entries.map(e=>e.action))].map(a=><option key={a}>{a}</option>)}</select></label></div>{error&&<p className="notice error" role="alert">{error}</p>}{loading?<div className="skeleton-list" role="status" aria-label="Loading audit history"><div/><div/><div/></div>:!filtered.length?<DocSetuEmptyState title="No matching activity" description="Try another search or choose all activities."/>:<div className="audit-ledger"><div className="audit-labels"><span>When</span><span>Activity</span><span>By</span></div>{filtered.map(entry=><article className="audit-record" key={entry.id}><time dateTime={new Date(entry.timestamp).toISOString()}>{date(entry.timestamp)}</time><div><h2>{entry.action}</h2><p>{entry.target}</p>{entry.id.startsWith('aud-')&&<small>Sample activity</small>}</div><div><p className="audit-actor">{entry.actorName}</p><p className="audit-email">{entry.actorEmail}</p></div></article>)}</div>}<p className="local-state-note" role="status">{loading?'':`${filtered.length} recorded activities shown.`}</p></div>;
}

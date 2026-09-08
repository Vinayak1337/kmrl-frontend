'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { DocumentAction } from '@/types/docsetu';
import { listAllActions } from '@/services/actions';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

type Status = 'pending' | 'in_progress' | 'completed';
type Filter = 'all' | 'due_soon' | 'in_progress' | 'completed';
export default function ActionsPage() {
  const [actions,setActions] = useState<DocumentAction[]>([]);
  const [statuses,setStatuses] = useState<Record<string,Status>>({});
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState<Filter>('all');
  const [team,setTeam] = useState('All');
  const [copied,setCopied] = useState('');
  const [error,setError] = useState('');
  useEffect(() => { listAllActions().then(setActions).catch(() => setError('Could not load actions. Refresh to try again.')).finally(() => setLoading(false)); try { const saved = JSON.parse(localStorage.getItem('docsetu_action_statuses') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) setStatuses(saved); } catch { setStatuses({}); } }, []);
  const status = (action: DocumentAction) => statuses[action.id] || 'pending';
  const update = (id:string, next:Status) => { const updated = {...statuses,[id]:next}; setStatuses(updated); try { localStorage.setItem('docsetu_action_statuses',JSON.stringify(updated)); } catch { setError('The status changed for this visit, but could not be saved in this browser.'); } };
  const copy = async (action:DocumentAction) => { try { await navigator.clipboard.writeText(`Action: ${action.action}\nDocument: ${action.documentTitle}${action.sectionTitle ? ` (${action.sectionTitle})` : ''}\nTeam: ${action.team}${action.dueDate ? ` | Due: ${action.dueDate}` : ''}`); setCopied(action.id); setTimeout(() => setCopied(''),2000); } catch { setError('Could not copy this reference. Select and copy the source text manually.'); } };
  const teams = [...new Set(actions.map(a=>a.team))].filter(Boolean);
  const scoped = actions.filter(a=>team === 'All' || a.team === team);
  const matches = (a:DocumentAction, f:Filter) => f === 'all' || (f === 'due_soon' ? !!a.dueDate && status(a) !== 'completed' : status(a) === f);
  const filtered = scoped.filter(a=>matches(a,filter));
  return <div className="desk-page"><header className="page-heading"><div><p className="eyebrow">From document to follow-up</p><h1>Actions</h1><p>Review responsibilities and deadlines against the source.</p></div><label className="standalone-select"><span>Team</span><select value={team} onChange={e=>setTeam(e.target.value)}><option value="All">All teams</option>{teams.map(t=><option key={t}>{t}</option>)}</select></label></header><div className="action-filter-bar"><nav className="document-tabs" aria-label="Filter actions">{([['all','All actions'],['due_soon','With deadlines'],['in_progress','In progress'],['completed','Completed']] as const).map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}<span>{loading ? '–' : scoped.filter(a=>matches(a,value)).length}</span></button>)}</nav></div><p className="local-state-note">Your progress is saved in this browser.</p>{error && <p className="notice error" role="alert">{error}</p>}{loading ? <div className="skeleton-list" role="status" aria-label="Loading actions"><div/><div/><div/></div> : !filtered.length ? <DocSetuEmptyState title="No actions in this view" description="Choose another team or filter to see more actions." /> : <div className="action-ledger">{filtered.map(action=><article className={`action-record ${status(action)==='completed'?'action-complete':''}`} key={action.id}><label className="complete-control"><input type="checkbox" checked={status(action)==='completed'} onChange={e=>update(action.id,e.target.checked?'completed':'pending')} /><span className="sr-only">Mark {action.action} complete</span></label><div className="action-record-main"><div className="action-source-meta"><span>{action.team || 'Unassigned'}{action.documentId?.startsWith('doc-kmrl') ? ' · Sample action' : ''}</span>{action.dueDate && <span className="due-label">Due {action.dueDate}</span>}</div><h2>{action.action}</h2><Link href={`/documents/${action.documentId}?tab=actions`} className="text-link">{action.documentTitle || action.docTitle || 'Read source document'}<ArrowUpRight size={13}/></Link></div><div className="action-record-controls"><label><span className="sr-only">Status for {action.action}</span><select value={status(action)} onChange={e=>update(action.id,e.target.value as Status)}><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><button className="icon-button" onClick={()=>void copy(action)} aria-label={copied===action.id?'Reference copied':`Copy reference for ${action.action}`}>{copied===action.id?<Check size={15}/>:<Copy size={15}/>}</button></div></article>)}</div>}<span className="sr-only" role="status">{copied ? 'Reference copied' : ''}</span></div>;
}

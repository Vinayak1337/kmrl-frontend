'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileText, Plus } from 'lucide-react';
import { listDocuments } from '@/services/documents';
import { listAllActions } from '@/services/actions';
import { DocSetuDocument, DocumentAction } from '@/types/docsetu';
import { Omnibox } from '@/components/shell/Omnibox';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocSetuDocument[]>([]);
  const [actions, setActions] = useState<DocumentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { Promise.all([listDocuments({ pageSize: 6 }), listAllActions()]).then(([docs, nextActions]) => { setDocuments(docs.documents); setActions(nextActions.filter(a => a.dueDate || a.isUrgent)); }).catch(() => setError('Could not load your workspace. Refresh to try again.')).finally(() => setLoading(false)); }, []);
  const ask = (question: string) => window.dispatchEvent(new CustomEvent('open-docsetu-ai', { detail: { question } }));
  return <div className="desk-page">
    <header className="page-heading"><div><p className="eyebrow">Your working desk</p><h1>Workspace</h1><p>Pick up a document. Find what needs your attention.</p></div><button className="text-link" onClick={() => window.dispatchEvent(new Event('open-docsetu-ingest'))}>Add a document <Plus size={17} /></button></header>
    {error && <p className="notice error" role="alert">{error}</p>}
    <section className="desk-search"><div><h2>What are you looking for?</h2><p>Search the collection or ask a question across documents.</p></div><Omnibox placeholder="Search a title, team, or ask a question…" onAskDocSetu={ask} /></section>
    <div className="desk-columns"><section className="recent-documents"><div className="section-heading"><h2>Recent documents</h2><Link className="text-link" href="/documents">View collection <ArrowUpRight size={15} /></Link></div>
      {loading ? <div className="skeleton-list" role="status" aria-label="Loading documents"><div /><div /><div /></div> : documents.length ? <div className="document-ledger">{documents.map((doc, index) => <Link href={`/documents/${doc.id}`} className="ledger-row" key={doc.id}><span className="ledger-number">{String(index + 1).padStart(2, '0')}</span><div><div className="ledger-meta"><span>{doc.type}</span><span>{doc.team}</span>{doc.id.startsWith('doc-kmrl') && <span>Sample</span>}</div><h3>{doc.title}</h3><p>{doc.summary}</p><span className="ledger-detail">{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'} · {doc.sectionsCount} {doc.sectionsCount === 1 ? 'section' : 'sections'}</span></div><ArrowUpRight size={18} /></Link>)}</div> : <p className="empty-state">No documents yet. Add one to begin.</p>}
    </section><aside className="attention-column"><div className="section-heading"><h2>For follow-up</h2><Link href="/actions" aria-label="View all actions" className="icon-button"><ArrowUpRight size={17} /></Link></div><p className="muted">Actions with a deadline or marked urgent.</p>{loading ? <div className="skeleton-list" role="status" aria-label="Loading actions"><div /><div /></div> : actions.length ? actions.slice(0, 4).map((action, index) => <article className="follow-up" key={action.id || index}><span className="due-label">{action.dueDate || 'Urgent'}</span><h3>{action.action}</h3><p>{action.team || action.owner || 'Unassigned'}</p><Link href={action.documentId ? `/documents/${action.documentId}` : '/actions'} className="text-link">Read source <ArrowRight size={14} /></Link></article>) : <p className="empty-state">No actions with deadlines to show.</p>}<div className="desk-note"><FileText size={21} /><h3>Keep the source in view.</h3><p>Open any document to read its sections, review actions, or translate a passage.</p></div></aside></div>
    <section className="question-strip"><h2>Start a question</h2>{['Which documents need review?', 'Summarize the procurement approval requirements.'].map(q => <button className="text-link" key={q} onClick={() => ask(q)}>{q}<ArrowUpRight size={15} /></button>)}</section>
  </div>;
}

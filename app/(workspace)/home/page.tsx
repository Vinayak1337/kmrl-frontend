'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { listDocuments } from '@/services/documents';
import { DocSetuDocument } from '@/types/docsetu';
import { DeadlineSidebar } from '@/components/alerts/DeadlineSidebar';
import { Omnibox } from '@/components/shell/Omnibox';

export default function HomePage() {
  const [documents, setDocuments] = useState<DocSetuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { listDocuments({ pageSize: 6 }).then(docs => setDocuments(docs.documents)).catch(() => setError('Could not load your workspace. Refresh to try again.')).finally(() => setLoading(false)); }, []);
  const ask = (question: string) => window.dispatchEvent(new CustomEvent('open-docsetu-ai', { detail: { question } }));
  return <div className="desk-page">
    <header className="page-heading"><div><h1>Workspace</h1></div></header>
    {error && <p className="notice error" role="alert">{error}</p>}
    <section className="desk-search"><Omnibox placeholder="Search a title, team, or ask a question…" onAskDocSetu={ask} /></section>
    <div className="desk-columns"><section className="recent-documents"><div className="section-heading"><h2>Recent documents</h2><Link className="text-link" href="/documents">View collection <ArrowUpRight size={15} /></Link></div>
      {loading ? <div className="skeleton-list" role="status" aria-label="Loading documents"><div /><div /><div /></div> : documents.length ? <div className="document-ledger">{documents.map((doc, index) => <Link href={`/documents/${doc.id}`} className="ledger-row" key={doc.id}><span className="ledger-number">{String(index + 1).padStart(2, '0')}</span><div><div className="ledger-meta"><span>{doc.type}</span><span>{doc.team}</span>{doc.id.startsWith('doc-docsetu') && <span>Sample</span>}</div><h3>{doc.title}</h3><p>{doc.summary}</p><span className="ledger-detail">{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'} · {doc.sectionsCount} {doc.sectionsCount === 1 ? 'section' : 'sections'}</span></div><ArrowUpRight size={18} /></Link>)}</div> : <p className="empty-state">No documents yet. Add one to begin.</p>}
    </section><DeadlineSidebar /></div>
  </div>;
}

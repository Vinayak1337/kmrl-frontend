'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, Plus, LayoutGrid, List, Trash2, MessageSquare } from 'lucide-react';
import { DocSetuDocument } from '@/types/docsetu';
import { listDocuments, deleteDocument } from '@/services/documents';
import { VALID_TEAMS, VALID_DOC_TYPES } from '@/adapters/documentAdapter';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';
import { DocumentIngestModal } from '@/components/documents/DocumentIngestModal';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';
import { Modal } from '@/components/workspace/Modal';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocSetuDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState('All');
  const [type, setType] = useState('All');
  const [language, setLanguage] = useState('All');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [ingest, setIngest] = useState(false);
  const [remove, setRemove] = useState<DocSetuDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [urlReady, setUrlReady] = useState(false);
  const requestVersion = useRef(0);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') || ''); setTeam(params.get('team') || 'All');
      setType(params.get('type') || 'All'); setLanguage(params.get('language') || 'All');
      setView(params.get('view') === 'grid' ? 'grid' : 'list');
      setPage(Math.max(0, Number(params.get('page')) || 0)); setUrlReady(true);
    };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (team !== 'All') params.set('team', team);
    if (type !== 'All') params.set('type', type);
    if (language !== 'All') params.set('language', language);
    if (view !== 'list') params.set('view', view);
    if (page) params.set('page', String(page));
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [query, team, type, language, view, page, urlReady]);
  const loadData = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = await listDocuments({ team, type, search: query, language, page, pageSize: 50 });
      if (version === requestVersion.current) { setDocuments(result.documents); setTotal(result.total); }
    } catch { if (version === requestVersion.current) { setDocuments([]); setTotal(0); setError('Could not load documents. Try again.'); } }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [team, type, query, language, page]);
  useEffect(() => {
    if (!urlReady) return;
    const versionCounter = requestVersion;
    const timer = setTimeout(() => void loadData(), 180);
    return () => { clearTimeout(timer); versionCounter.current++; };
  }, [loadData, urlReady]);
  const handleDelete = async () => {
    if (!remove) return;
    setDeleting(true); setError('');
    try { await deleteDocument(remove.id); setDocuments(prev => prev.filter(d => d.id !== remove.id)); setTotal(prev => Math.max(0, prev - 1)); setNotice('Document removed.'); setRemove(null); if (documents.length === 1 && page > 0) setPage(p => p - 1); else void loadData(); }
    catch { setError('Could not remove this document. Check your access and try again.'); }
    finally { setDeleting(false); }
  };
  const filtered = documents;
  const reset = () => { setQuery(''); setTeam('All'); setType('All'); setLanguage('All'); setPage(0); };
  return <div className="desk-page collection-page">
    <header className="page-heading"><div><p className="eyebrow">The collection</p><h1>Documents</h1><p>Source files, summaries, and the work they contain.</p></div><button className="button button-primary" onClick={() => setIngest(true)}><Plus size={16} />Add document</button></header>
    <div className="collection-toolbar"><label className="collection-search"><Search size={17} /><span className="sr-only">Search documents</span><input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} placeholder="Search title, team, or content…" name="document-search" autoComplete="off" /></label><div className="view-switch" aria-label="Document view"><button className="icon-button" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button><button className="icon-button" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button></div></div>
    <div className="collection-filters"><label>Team<select value={team} onChange={e => { setTeam(e.target.value); setPage(0); }}><option value="All">All teams</option>{VALID_TEAMS.map(t => <option key={t}>{t}</option>)}</select></label><label>Type<select value={type} onChange={e => { setType(e.target.value); setPage(0); }}><option value="All">All types</option>{VALID_DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></label><label>Language<select value={language} onChange={e => { setLanguage(e.target.value); setPage(0); }}><option value="All">All languages</option>{SUPPORTED_LANGUAGES.map(l => <option key={l.name} value={l.name}>{l.name} ({l.nativeName})</option>)}</select></label>{(query || team !== 'All' || type !== 'All' || language !== 'All') && <button className="text-link" onClick={reset}>Clear filters</button>}<span className="result-count" role="status">{loading ? 'Loading…' : `${filtered.length} documents shown`}</span></div>
    {error && <div className="notice error" role="alert">{error} <button className="text-link" onClick={loadData}>Try again</button></div>}{notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <div className="skeleton-list" role="status" aria-label="Loading collection"><div /><div /><div /></div> : !filtered.length ? <DocSetuEmptyState title="No documents to show" description="Try another search or clear your filters. You can also add a document to this collection." action={<button className="button" onClick={reset}>Clear filters</button>} /> : <div className={view === 'list' ? 'collection-list' : 'collection-grid'}>{filtered.map((doc, index) => <article className="collection-record" key={doc.id}>
      <span className="record-index">{String(page * 50 + index + 1).padStart(2, '0')}</span><div className="record-main"><div className="ledger-meta"><span>{doc.type}</span><span>{doc.team}</span>{doc.id.startsWith('doc-kmrl') && <span>Sample document</span>}</div><h2><Link href={`/documents/${doc.id}`}>{doc.title}<ArrowUpRight size={16} /></Link></h2><p>{doc.summary.replace(/^#+\s*/gm, '')}</p><div className="record-details"><span>{doc.language}</span><span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span><span>{doc.sectionsCount} {doc.sectionsCount === 1 ? 'section' : 'sections'}</span><span className={`document-status status-${doc.status}`}>{doc.status === 'ready' ? 'Ready to read' : doc.status === 'processing' ? 'Processing' : 'Needs attention'}</span></div></div>
      <div className="record-actions"><button className="text-link" onClick={() => window.dispatchEvent(new CustomEvent('open-docsetu-ai', { detail: { question: `What are the key requirements and deadlines in ${doc.title}?`, docId: doc.id } }))}><MessageSquare size={15} />Ask</button><button className="icon-button" aria-label={`Remove ${doc.title}`} onClick={() => { setError(''); setRemove(doc); }}><Trash2 size={15} /></button></div>
    </article>)}</div>}
    {total > 50 && <nav className="pagination" aria-label="Document pages"><button className="button" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1}</span><button className="button" disabled={(page + 1) * 50 >= total || loading} onClick={() => setPage(p => p + 1)}>Next</button></nav>}
    <DocumentIngestModal isOpen={ingest} onClose={() => setIngest(false)} onSuccess={() => { setIngest(false); void loadData(); }} />
    <Modal open={!!remove} onClose={() => setRemove(null)} title="Remove document?" busy={deleting}><p>This removes <strong>{remove?.title}</strong> from the workspace. This cannot be undone.</p>{error && <p className="notice error" role="alert">{error}</p>}<div className="modal-actions"><button className="button" disabled={deleting} onClick={() => setRemove(null)}>Keep document</button><button className="button button-danger" disabled={deleting} onClick={handleDelete}>{deleting ? 'Removing…' : 'Remove document'}</button></div></Modal>
  </div>;
}

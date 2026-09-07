'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Check, Copy, Columns2, Languages, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocSetuDocument, DocumentSection } from '@/types/docsetu';
import { getDocument, getDocumentSections, deleteDocument } from '@/services/documents';
import { translateContent, TranslationResponse } from '@/services/intelligence';
import { AiSidePanel } from '@/components/shell/AiSidePanel';
import { Modal } from '@/components/workspace/Modal';
import { DocSetuEmptyState, DocSetuLoadingIndicator } from '@/components/brand/DocSetuBrand';

const tabs = ['overview', 'sections', 'actions', 'source', 'activity'] as const;
type Tab = typeof tabs[number];
const formatDate = (value: Date | string | undefined) => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not recorded';
function Markdown({ children }: { children: string }) { return <div className="doc-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown></div>; }
function Points({ items }: { items: string[] }) { return <ul className="reader-points">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>; }

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<DocSetuDocument | null>(null);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [split, setSplit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assistant, setAssistant] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [translate, setTranslate] = useState(false);
  const [language, setLanguage] = useState('Hindi');
  const [translation, setTranslation] = useState<TranslationResponse | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  const [remove, setRemove] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await getDocument(id); setDoc(result);
      if (result.sections?.length) setSections(result.sections);
      else { const resultSections = await getDocumentSections(id, 0, 50); setSections(resultSections.sections); }
    } catch { setError('This document could not be loaded. It may have moved, or your access may have changed.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const sync = () => { const query = new URLSearchParams(window.location.search); const next = query.get('tab'); setTab(tabs.includes(next as Tab) ? next as Tab : 'overview'); setSectionIndex(Math.max(0, Number(query.get('section')) || 0)); setSplit(query.get('view') === 'split'); };
    sync(); window.addEventListener('popstate', sync); return () => window.removeEventListener('popstate', sync);
  }, [id]);
  const navigate = (nextTab: Tab, nextIndex = sectionIndex, nextSplit = split) => {
    setTab(nextTab); setSectionIndex(nextIndex); setSplit(nextSplit);
    const query = new URLSearchParams(window.location.search); query.set('tab', nextTab);
    if (nextIndex) query.set('section', String(nextIndex)); else query.delete('section');
    if (nextSplit) query.set('view', 'split'); else query.delete('view');
    window.history.pushState(null, '', `${window.location.pathname}?${query}`);
  };
  const activeSection = sections[Math.min(sectionIndex, Math.max(sections.length - 1, 0))];
  const ask = (question?: string) => { setInitialQuestion(question); setAssistant(true); };
  const copyBrief = async () => { if (!doc) return; try { await navigator.clipboard.writeText(doc.briefMd || doc.summary); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Could not copy the brief. Select the text and copy it manually.'); } };
  const handleTranslate = async () => {
    if (!doc) return;
    setTranslating(true); setTranslationError(''); setTranslation(null);
    try { const content = (tab === 'sections' || split) && activeSection ? activeSection : doc; setTranslation(await translateContent({ language, summary: content.summary, keyPoints: content.keyPoints })); }
    catch { setTranslationError('Translation is unavailable right now. Please try again.'); }
    finally { setTranslating(false); }
  };
  const handleDelete = async () => { setDeleting(true); setError(''); try { await deleteDocument(id); router.push('/documents'); } catch { setError('Could not remove this document. Check your access and try again.'); } finally { setDeleting(false); } };
  if (loading) return <div className="desk-page"><DocSetuLoadingIndicator text="Loading document…" /><div className="skeleton-list"><div /><div /><div /></div></div>;
  if (!doc) return <div className="desk-page"><DocSetuEmptyState title="Document unavailable" description={error || 'The requested document could not be found.'} action={<><Link href="/documents" className="button">Back to documents</Link><button className="button" onClick={load}>Try again</button></>} /></div>;
  const sectionReader = <>
    <div className="reader-section-heading"><div><span className="eyebrow">{activeSection ? `Pages ${activeSection.pageRange.start}–${activeSection.pageRange.end}` : 'Sections'}</span><h2>{activeSection?.title || 'No sections available'}</h2></div>{activeSection && <button className="text-link" onClick={() => ask(`Summarize the requirements in ${activeSection.title}`)}><MessageSquare size={15} />Ask about section</button>}</div>
    {activeSection && <><section className="reader-block"><h3>Summary</h3><Markdown>{activeSection.summaryMd || activeSection.summary || 'No summary available.'}</Markdown></section>{activeSection.keyPoints?.length > 0 && <section className="reader-block"><h3>Key details</h3><Points items={activeSection.keyPoints} /></section>}{activeSection.actions?.length > 0 && <section className="reader-block"><h3>Actions in this section</h3><Points items={activeSection.actions} /></section>}{activeSection.affectedTeams?.length > 0 && <p className="muted">Affected teams: {activeSection.affectedTeams.join(' · ')}</p>}{activeSection.criticalFlags?.length > 0 && <section className="notice"><h3>Items to review</h3><Points items={activeSection.criticalFlags} /></section>}{activeSection.sourceContent && <details className="source-disclosure" open={split}><summary>Read source text · Pages {activeSection.pageRange.start}–{activeSection.pageRange.end}</summary><Markdown>{activeSection.sourceContent}</Markdown></details>}</>}
  </>;
  const actionList = (showAll = true) => <div className="reader-action-list">{(showAll ? doc.actions : doc.actions.slice(0, 4)).map(action => <article key={action.id}><div className="action-source-meta"><span>{action.type === 'information' ? 'Information' : 'Action'}</span>{action.dueDate && <span className="due-label">Due {action.dueDate}</span>}</div><h3>{action.action}</h3><p>{action.team || action.owner || 'Owner not specified'}{action.sectionTitle ? ` · ${action.sectionTitle}` : ''}</p>{action.sectionId && sections.some(s => s.id === action.sectionId) && <button className="text-link" onClick={() => navigate('sections', sections.findIndex(s => s.id === action.sectionId), false)}>Read section <ArrowUpRight size={13} /></button>}</article>)}{!doc.actions.length && <p className="muted">No actions recorded for this document.</p>}</div>;
  return <div className="desk-page document-page">
    <Link href="/documents" className="text-link back-link"><ArrowLeft size={14} />Documents</Link>
    <header className="document-heading"><div className="ledger-meta"><span>{doc.type}</span><span>{doc.team}</span><span>{doc.language}</span>{doc.id.startsWith('doc-kmrl') && <span>Sample document</span>}</div><h1>{doc.title}</h1><div className="document-heading-bottom"><p>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'} <span>·</span> {sections.length} {sections.length === 1 ? 'section' : 'sections'} <span>·</span> Added {formatDate(doc.uploadedAt)}</p><div className="document-controls"><button className="button button-primary" onClick={() => ask()}><MessageSquare size={15} />Ask this document</button><button className="button" onClick={() => { setTranslate(true); setTranslation(null); setTranslationError(''); }}><Languages size={15} />Translate</button><button className="icon-button" aria-label="Remove document" onClick={() => setRemove(true)}><Trash2 size={16} /></button></div></div></header>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="document-navigation"><nav aria-label="Document views" className="document-tabs">{tabs.map(item => <button key={item} aria-pressed={!split && tab === item} onClick={() => navigate(item, sectionIndex, false)}>{item === 'overview' ? 'Overview' : item === 'sections' ? `Sections (${sections.length})` : item.charAt(0).toUpperCase() + item.slice(1)}</button>)}</nav><button className="text-link split-toggle" aria-pressed={split} onClick={() => navigate(tab, sectionIndex, !split)}><Columns2 size={16} />{split ? 'Close split view' : 'Split view'}</button></div>
    {split ? <div className="split-reader"><article className="reader-paper"><div className="section-stepper"><label className="sr-only" htmlFor="split-section">Choose section</label><select id="split-section" value={sectionIndex} onChange={e => navigate(tab, Number(e.target.value), true)}>{sections.map((s,i) => <option key={s.id} value={i}>{i+1}. {s.title}</option>)}</select><div><button className="button" disabled={sectionIndex <= 0} onClick={() => navigate(tab, sectionIndex-1, true)}>Previous</button><button className="button" disabled={sectionIndex >= sections.length-1} onClick={() => navigate(tab, sectionIndex+1, true)}>Next</button></div></div>{sectionReader}</article><aside className="split-notes"><section className="reader-block"><div className="section-heading"><h2>Document brief</h2><button className="text-link" onClick={copyBrief}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div><Markdown>{doc.briefMd || doc.summary}</Markdown></section><section className="reader-block"><h2>Actions & deadlines</h2>{actionList()}</section></aside></div> : <>
      {tab === 'overview' && <div className="overview-layout"><article className="reader-paper"><div className="section-heading"><h2>Document brief</h2><button className="text-link" onClick={copyBrief} aria-live="polite">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy brief'}</button></div><Markdown>{doc.briefMd || doc.summary || 'No brief available.'}</Markdown>{doc.keyPoints.length > 0 && <section className="reader-block"><h2>Important points</h2><Points items={doc.keyPoints} /></section>}</article><aside className="document-context"><h2>At a glance</h2><dl><div><dt>Owner</dt><dd>{doc.owner || doc.team}</dd></div><div><dt>Effective date</dt><dd>{doc.effectiveDate || 'Not specified'}</dd></div><div><dt>Status</dt><dd>{doc.status === 'ready' ? 'Ready to read' : doc.status === 'processing' ? 'Processing' : 'Needs attention'}</dd></div><div><dt>Affected teams</dt><dd>{doc.affectedTeams.join(' · ') || 'Not specified'}</dd></div>{doc.tags.length > 0 && <div><dt>Tags</dt><dd>{doc.tags.join(' · ')}</dd></div>}</dl>{doc.risks.length > 0 && <section className="risk-notes"><h3>Items to review</h3>{doc.risks.map((risk,i) => <div key={i}><strong>{risk.title}</strong>{risk.description && <p>{risk.description}</p>}</div>)}</section>}<section className="context-actions"><div className="section-heading"><h2>Actions</h2><button className="text-link" onClick={() => navigate('actions')}>View all <ArrowUpRight size={13} /></button></div>{actionList(false)}</section></aside></div>}
      {tab === 'sections' && <div className="sections-layout"><nav className="section-index" aria-label="Document sections"><h2>Contents</h2>{sections.map((s,i) => <button key={s.id} aria-current={i === sectionIndex ? 'true' : undefined} onClick={() => navigate('sections',i)}><span>{String(i+1).padStart(2,'0')}</span><span>{s.title}<small>Pages {s.pageRange.start}–{s.pageRange.end}</small></span></button>)}</nav><article className="reader-paper">{sectionReader}</article></div>}
      {tab === 'actions' && <section className="reader-paper full-reader"><div className="section-heading"><h2>Actions in this document</h2><Link className="text-link" href="/actions">All workspace actions <ArrowUpRight size={14} /></Link></div><p className="muted">Review these items against the source before following up.</p>{actionList()}</section>}
      {tab === 'source' && <article className="reader-paper full-reader"><div className="section-heading"><h2>Source text</h2>{doc.rawUrl && <a href={doc.rawUrl} target="_blank" rel="noreferrer" className="text-link">Open original file <ArrowUpRight size={14} /></a>}</div>{sections.some(s => s.sourceContent) ? sections.filter(s => s.sourceContent).map(s => <section className="source-page" key={s.id}><span className="eyebrow">Pages {s.pageRange.start}–{s.pageRange.end}</span><h3>{s.title}</h3><Markdown>{s.sourceContent}</Markdown></section>) : <p className="empty-state">Source text is not available for this document.</p>}</article>}
      {tab === 'activity' && <section className="reader-paper full-reader"><div className="section-heading"><h2>Document activity</h2><Link className="text-link" href="/audit">Workspace audit history <ArrowUpRight size={14} /></Link></div><dl className="activity-record"><div><dt>Added to workspace</dt><dd>{formatDate(doc.uploadedAt)}</dd></div>{doc.updatedAt && <div><dt>Last updated</dt><dd>{formatDate(doc.updatedAt)}</dd></div>}<div><dt>Current processing status</dt><dd>{doc.status}</dd></div></dl><p className="muted">Showing the dates recorded with this document.</p></section>}
    </>}
    <Modal open={translate} onClose={() => setTranslate(false)} title="Translate content" description={(tab === 'sections' || split) && activeSection ? activeSection.title : 'Document summary and key points'} busy={translating} wide={!!translation}><form className="form-stack translation-form" onSubmit={event => { event.preventDefault(); void handleTranslate(); }}><label>Language<select value={language} onChange={event => { setLanguage(event.target.value); setTranslation(null); }} disabled={translating}>{['Hindi','Malayalam','Tamil','English'].map(l => <option key={l}>{l}</option>)}</select></label><button className="button button-primary" type="submit" disabled={translating}>{translating && <Loader2 size={15} className="animate-spin" />}{translating ? 'Translating…' : 'Translate'}</button></form>{translationError && <p className="notice error" role="alert">{translationError}</p>}{translation && <div role="status" className="translation-result" lang={{ Hindi:'hi', Malayalam:'ml', Tamil:'ta', English:'en' }[translation.language] || 'en'}><h3>Translation · {translation.language}</h3><Markdown>{translation.summary}</Markdown><Points items={translation.keyPoints} />{translation.actionableItems.length > 0 && <Points items={translation.actionableItems} />}</div>}</Modal>
    <Modal open={remove} onClose={() => setRemove(false)} title="Remove document?" busy={deleting}><p>This removes <strong>{doc.title}</strong> from the workspace. This cannot be undone.</p>{error && <p className="notice error" role="alert">{error}</p>}<div className="modal-actions"><button className="button" onClick={() => setRemove(false)} disabled={deleting}>Keep document</button><button className="button button-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Removing…' : 'Remove document'}</button></div></Modal>
    <AiSidePanel isOpen={assistant} onClose={() => setAssistant(false)} docId={doc.id} docTitle={doc.title} initialQuestion={initialQuestion} />
  </div>;
}

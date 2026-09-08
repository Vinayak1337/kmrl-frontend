'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Loader2, Search, X } from 'lucide-react';
import { searchDocuments } from '@/services/intelligence';

interface SearchItem { id?: string; documentId?: string; title?: string; documentTitle?: string; summary?: string; nodeSummary?: string }
export function Omnibox({ className = '', onAskDocSetu, placeholder = 'Search documents or ask a question…' }: { className?: string; onAskDocSetu?: (question: string) => void; placeholder?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'documents' | 'ask'>('all');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 2 || mode === 'ask') { setResults([]); setLoading(false); return; }
    const timer = setTimeout(async () => { setLoading(true); try { const result = await searchDocuments({ query: query.trim(), limit: 5 }); if (!cancelled) setResults(result); } catch { if (!cancelled) setResults([]); } finally { if (!cancelled) setLoading(false); } }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, mode]);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setFocused(false); };
    const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); ref.current?.querySelector('input')?.focus(); } };
    document.addEventListener('mousedown',outside); window.addEventListener('keydown',shortcut);
    return () => { document.removeEventListener('mousedown',outside); window.removeEventListener('keydown',shortcut); };
  }, []);
  const ask = () => { if (onAskDocSetu) onAskDocSetu(query.trim()); else router.push(`/intelligence?q=${encodeURIComponent(query.trim())}`); setFocused(false); };
  const submit = () => { if (!query.trim()) return; if (mode === 'ask' || (mode === 'all' && (/^(what|which|who|where|when|why|how|summarize|list|explain|show|can)\b/i.test(query.trim()) || query.trim().endsWith('?')))) ask(); else { router.push(`/documents?q=${encodeURIComponent(query.trim())}`); setFocused(false); } };
  return <div ref={ref} className={`omnibox ${className}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}><form onSubmit={event => { event.preventDefault(); submit(); }}><Search size={17} /><input aria-label="Search workspace" name="workspace-search" autoComplete="off" value={query} onChange={event => setQuery(event.target.value)} onFocus={() => setFocused(true)} onKeyDown={event => { if (event.key === 'Escape') setFocused(false); }} placeholder={placeholder} />{loading && <Loader2 size={15} className="animate-spin" />}{query && <button className="icon-button" type="button" aria-label="Clear search" onClick={() => { setQuery(''); setResults([]); }}><X size={14} /></button>}<label className="search-mode"><span className="sr-only">Search mode</span><select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="all">All</option><option value="documents">Documents</option><option value="ask">Ask</option></select></label><button className="icon-button" type="submit" aria-label="Search or ask" disabled={!query.trim()}><ArrowRight size={16} /></button></form>{focused && query.trim().length >= 2 && <div className="omnibox-results"><button className="search-ask" onClick={ask}>Ask DocSetu: “{query}”<ArrowUpRight size={15} /></button>{mode !== 'ask' && <><p className="search-result-label" role="status">{loading ? 'Searching…' : results.length ? 'Matching documents' : 'No matching documents'}</p>{results.map((result,i) => <Link key={`${result.documentId || result.id}-${i}`} href={`/documents/${encodeURIComponent(result.documentId || result.id || '')}`} onClick={() => setFocused(false)}><span>{result.documentTitle || result.title || 'Untitled document'}</span><ArrowUpRight size={14} /></Link>)}</>}</div>}</div>;
}

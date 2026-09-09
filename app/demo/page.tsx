"use client";

import React from 'react';
import Link from 'next/link';
import { CODE_TO_LANGUAGE_MAP } from '@/lib/languages';

type DemoPage = { page: number; html?: string; image?: string; content?: Record<string, string> };
type DemoPreview = { title?: string; language?: string; languages?: string[]; pages: DemoPage[] };

export default function DemoPage(): React.ReactElement {
  // Intentionally ignore all query params; always show the default demo in all-slides view
  const doc = 'kochidocs';

  const [data, setData] = React.useState<DemoPreview | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activePage, setActivePage] = React.useState<number>(1);
  const [language, setLanguage] = React.useState<string>('en');
  const [viewMode, setViewMode] = React.useState<'all' | 'single'>('all');

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/demo/previews/${doc}.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load demo: ${res.status}`);
        const json = (await res.json()) as DemoPreview;
        if (cancelled) return;
        setData(json);
        setActivePage(json.pages?.[0]?.page || 1);
        setLanguage(json.language || json.languages?.[0] || 'en');
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const languages: string[] = React.useMemo(() => {
    if (data?.languages && data.languages.length > 0) return data.languages;
    const first = data?.pages?.[0];
    if (first?.content) return Object.keys(first.content);
    return ['en'];
  }, [data]);

  const current = React.useMemo(() => {
    const pg = data?.pages?.find((p) => p.page === activePage);
    if (!pg) return null;
    const html = pg.html || (pg.content ? (pg.content[language] || Object.values(pg.content)[0] || '') : '');
    return { ...pg, html } as DemoPage & { html: string };
  }, [data, activePage, language]);

  const shownPages = viewMode === 'single' && current ? [current] : data?.pages || [];
  return <main id="main-content" className="demo-page">
    <Link href="/home" className="text-link">← Back to workspace</Link>
    <header className="page-heading"><div><p className="eyebrow">Sample document</p><h1>{data?.title || 'Document preview'}</h1><p>Explore the reading and language views with a sample document.</p></div></header>
    <div className="collection-toolbar">
      <label className="filter-field">Language<select value={language} onChange={e => setLanguage(e.target.value)}>{languages.map(lng => <option key={lng} value={lng}>{CODE_TO_LANGUAGE_MAP[lng] || lng}</option>)}</select></label>
      <div className="demo-controls"><button className="button" aria-pressed={viewMode === 'all'} onClick={() => setViewMode('all')}>All slides</button><button className="button" aria-pressed={viewMode === 'single'} onClick={() => setViewMode('single')}>Single slide</button></div>
      {viewMode === 'single' && data && <div className="demo-controls"><button className="button" disabled={activePage === data.pages[0]?.page} onClick={() => setActivePage(data.pages[Math.max(0,data.pages.findIndex(p=>p.page===activePage)-1)].page)}>Previous</button><label className="sr-only" htmlFor="demo-page">Slide</label><select id="demo-page" value={activePage} onChange={e=>setActivePage(Number(e.target.value))}>{data.pages.map(p=><option key={p.page} value={p.page}>Slide {p.page}</option>)}</select><button className="button" disabled={activePage === data.pages.at(-1)?.page} onClick={() => setActivePage(data.pages[Math.min(data.pages.length-1,data.pages.findIndex(p=>p.page===activePage)+1)].page)}>Next</button></div>}
    </div>
    {loading && <p role="status">Loading sample document…</p>}
    {error && <p className="notice error" role="alert">The sample document could not be loaded. Please refresh to try again.</p>}
    {!loading && !error && shownPages.map(p => <section className="demo-slide" key={p.page}><h2>Slide {p.page}</h2>{p.image && <img width={1200} height={675} loading="lazy" src={p.image} alt={`Slide ${p.page}`} className="demo-slide-image" />}{/* eslint-disable-line @next/next/no-img-element */}<div className="doc-content" dangerouslySetInnerHTML={{__html:p.html || p.content?.[language] || Object.values(p.content || {})[0] || ''}} /></section>)}
  </main>;
}

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/UI/select';
import { Button } from '@/components/UI/button';

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Card className="sticky top-0 z-10 -mx-4 px-0 mb-6">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Demo Preview{data?.title ? ` — ${data.title}` : ''}</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Language</span>
              <Select value={language} onValueChange={setLanguage} placeholder="Language">
                <SelectTrigger />
                <SelectContent>
                  {languages.map((lng) => (
                    <SelectItem key={lng} value={lng}>{lng.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={viewMode === 'all' ? 'default' : 'outline'} onClick={() => setViewMode('all')}>All slides</Button>
              <Button variant={viewMode === 'single' ? 'default' : 'outline'} onClick={() => setViewMode('single')}>Single slide</Button>
            </div>
            {viewMode === 'single' && data?.pages?.length ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setActivePage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Select value={String(activePage)} onValueChange={(v) => setActivePage(Number(v))} placeholder="Slide">
                  <SelectTrigger />
                  <SelectContent>
                    {data.pages.map((p) => (
                      <SelectItem key={p.page} value={String(p.page)}>Slide {p.page}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setActivePage((p) => (data.pages ? Math.min(data.pages[data.pages.length - 1]?.page || p, p + 1) : p))}>Next</Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-40 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="text-red-600">{error}</div>
      )}
      {!loading && !error && data && (
        <div className="space-y-8">
          {viewMode === 'single' && current ? (
            <Card key={current.page}>
              <CardHeader className="bg-gray-50">
                <CardTitle>Slide {current.page} of {data.pages.length}</CardTitle>
              </CardHeader>
              <CardContent>
                {current.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.image} alt={`Slide ${current.page}`} className="mb-4 rounded border w-full max-h-96 object-contain bg-white" />
                )}
                <div className="doc-content" dangerouslySetInnerHTML={{ __html: current.html }} />
              </CardContent>
            </Card>
          ) : (
            data.pages.map((p) => {
              const html = p.html || (p.content ? (p.content[language] || Object.values(p.content)[0] || '') : '');
              return (
                <Card key={p.page}>
                  <CardHeader className="bg-gray-50">
                    <CardTitle>Slide {p.page}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {p.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={`Slide ${p.page}`} className="mb-4 rounded border w-full max-h-96 object-contain bg-white" />
                    )}
                    <div className="doc-content" dangerouslySetInnerHTML={{ __html: html }} />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <div className="mt-8 text-sm text-gray-500">Demo uses a fixed dataset and ignores query parameters.</div>
    </div>
  );
}

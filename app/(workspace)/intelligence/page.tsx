'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Conversation } from '@/components/workspace/Conversation';
import { DocSetuLoadingIndicator } from '@/components/brand/DocSetuBrand';

function IntelligenceContent() {
  const search = useSearchParams();
  return <div className="desk-page intelligence-page"><header className="page-heading"><div><p className="eyebrow">Read between documents</p><h1>Intelligence</h1><p>Questions, answers, and the sources behind them.</p></div></header><div className="intelligence-layout"><aside className="intelligence-guide"><h2>A useful answer starts<br />with a clear question.</h2><p>Name the subject, team, or document. Ask for the detail you need.</p><div><span>Find a requirement</span><p>What approvals does this purchase need?</p></div><div><span>Check a deadline</span><p>When must the renewal notice be sent?</p></div><div><span>Read the evidence</span><p>Open a reference to review the original wording.</p></div></aside><Conversation initialQuestion={search.get('q') || undefined} /></div></div>;
}
export default function IntelligencePage() { return <Suspense fallback={<DocSetuLoadingIndicator text="Opening intelligence…" />}><IntelligenceContent /></Suspense>; }

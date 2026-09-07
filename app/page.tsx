import Link from 'next/link';
import { ArrowRight, ArrowUpRight, FileText, Languages, ListChecks } from 'lucide-react';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';

export default function LandingPage() {
  return <div className="public-page">
    <nav className="public-nav" aria-label="Main navigation"><Link href="/" aria-label="DocSetu home"><DocSetuLogo /></Link><div><a href="#working-with-documents" className="text-link public-about">How it works</a><Link href="/login" className="text-link">Sign in <ArrowUpRight size={15} /></Link></div></nav>
    <main id="main-content">
      <section className="landing-hero">
        <p className="eyebrow">Document operations & intelligence</p>
        <h1>Your documents.<br /><span>A clearer way to work.</span></h1>
        <div className="hero-bottom"><p>Read the source. Find the answer. Follow through.<br />One workspace for the documents your team depends on.</p><Link href="/home" className="button button-primary">Open workspace <ArrowRight size={17} /></Link></div>
      </section>
      <section className="document-exhibit" aria-label="Illustrative document workflow">
        <div className="exhibit-index"><span className="eyebrow">Inside the workspace</span><h2>From the page<br />to the next step.</h2><p>Keep the original, its meaning, and the work it creates together.</p><span className="sample-note">Illustrative example</span></div>
        <article className="exhibit-document"><div className="document-mast"><FileText size={19} /><span>Operating procedure</span><span>Source</span></div><h3>Document review<br />and approval</h3><p className="document-subtitle">Records management · Review procedure</p><hr /><h4>Review responsibilities</h4><p>Before a document is issued, the assigned reviewer checks the content and records any changes required.</p><p><mark>The document owner resolves comments and submits the revised version for approval.</mark></p><div className="document-foot">Review procedure<span>01</span></div></article>
        <aside className="exhibit-notes"><div><span className="note-label">Understand</span><h3>Who follows up<br />on review comments?</h3><p>The document owner resolves comments before submitting a revised version.</p><span className="source-reference">Review responsibilities · Page 1</span></div><div className="exhibit-action"><ListChecks size={20} /><div><span className="note-label">Follow through</span><p>Resolve review comments</p><span>Owner: Document owner</span></div></div></aside>
      </section>
      <section id="working-with-documents" className="workflow-section"><div><p className="eyebrow">Working with documents</p><h2>A shared record.<br />More ways to use it.</h2><Link href="/login" className="text-link">Explore with a demo account <ArrowUpRight size={16} /></Link></div><div className="workflow-list">
        <article><FileText size={22} /><div><h3>Keep the source close</h3><p>Add a file or paste text. Browse documents by team, type, and language. Read a summary alongside the original sections.</p></div></article>
        <article><Languages size={22} /><div><h3>Read across languages</h3><p>Translate a section, ask a question, and follow references back to the document.</p></div></article>
        <article><ListChecks size={22} /><div><h3>Make the next step clear</h3><p>Review extracted actions and deadlines, find the responsible team, and track follow-up work.</p></div></article>
      </div></section>
      <section className="landing-close"><h2>Start with a document.</h2><Link href="/home" className="button button-primary">Go to workspace <ArrowRight size={17} /></Link></section>
    </main><footer className="public-footer"><DocSetuLogo size="sm" /><span>Documents, understanding, follow-through.</span><Link href="/request-deployment" className="text-link">Request access <ArrowUpRight size={15} /></Link></footer>
  </div>;
}

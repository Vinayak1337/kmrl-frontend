'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, Menu, X, Plus, Search, LogOut, MessageSquare } from 'lucide-react';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';
import { Omnibox } from './Omnibox';
import { AiSidePanel } from './AiSidePanel';
import { DocumentIngestModal } from '@/components/documents/DocumentIngestModal';

interface SessionUser { name?: string; email?: string; role?: string; department?: string }
const navigation = [['/home', 'Workspace'], ['/documents', 'Documents'], ['/intelligence', 'Intelligence'], ['/actions', 'Actions'], ['/people', 'People'], ['/access', 'Access'], ['/audit', 'Audit history']];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [ingest, setIngest] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [question, setQuestion] = useState<string>();
  const [docId, setDocId] = useState<string>();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  useEffect(() => { fetch('/api/auth/session').then(r => r.json()).then(d => setSession(d.user || null)).catch(() => setSession(null)); }, []);
  useEffect(() => {
    const open = (event: Event) => { const detail = (event as CustomEvent<{ question?: string; docId?: string }>).detail; setQuestion(detail?.question); setDocId(detail?.docId); setAssistant(true); };
    const upload = () => setIngest(true);
    window.addEventListener('open-docsetu-ai', open);
    window.addEventListener('open-docsetu-ingest', upload);
    return () => { window.removeEventListener('open-docsetu-ai', open); window.removeEventListener('open-docsetu-ingest', upload); };
  }, []);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenu(false); setSearch(false); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  const ask = (q?: string) => { setDocId(undefined); setQuestion(q); setAssistant(true); setSearch(false); };
  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true); setLogoutError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign-out failed');
      window.location.replace('/login');
    } catch { setLogoutError('Could not sign out. Please try again.'); setSigningOut(false); }
  };
  return <div className="workspace-shell">
    <header className="workspace-header"><div className="workspace-topline"><Link href="/home" aria-label="DocSetu workspace"><DocSetuLogo /></Link><span className="workspace-identity">KMRL <span>/</span> Document workspace</span><div className="workspace-tools"><button className="icon-button" onClick={() => setSearch(!search)} aria-label="Search workspace" aria-expanded={search}><Search size={18} /></button><button className="button ask-button" onClick={() => ask()}><MessageSquare size={16} />Ask DocSetu</button><button className="button button-primary" onClick={() => setIngest(true)} aria-label="Add document"><Plus size={17} /><span className="add-label">Add document</span></button><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" aria-expanded={menu}>{menu ? <X size={20} /> : <Menu size={20} />}</button><details className="account-menu"><summary aria-label="Account menu">{session?.name?.charAt(0) || session?.email?.charAt(0) || 'D'}</summary><div><strong>{session?.name || 'Your account'}</strong><p>{session?.email}</p><p>{session?.role?.toLowerCase()}</p><button className="text-link" onClick={logout} disabled={signingOut}><LogOut size={15} />{signingOut ? 'Signing out…' : 'Sign out'}</button>{logoutError && <p role="alert">{logoutError}</p>}</div></details></div></div>
      <nav className={`workspace-nav ${menu ? 'is-open' : ''}`} aria-label="Workspace navigation">{navigation.filter(([href]) => session?.role === 'ADMIN' || !['/people', '/audit'].includes(href)).map(([href, label]) => <Link href={href} key={href} onClick={() => setMenu(false)} aria-current={pathname === href || (href === '/documents' && pathname.startsWith('/documents/')) ? 'page' : undefined}>{label}</Link>)}<Link href="/" className="workspace-about">About DocSetu <ArrowUpRight size={13} /></Link></nav>
      {search && <div className="workspace-search"><Omnibox onAskDocSetu={ask} /><button className="icon-button" onClick={() => setSearch(false)} aria-label="Close search"><X size={18} /></button></div>}
    </header>
    <main id="main-content" className="workspace-main">{children}</main>
    <footer className="workspace-footer"><span>DocSetu · KMRL</span><span>Read the source. Review the result.</span></footer>
    <DocumentIngestModal isOpen={ingest} onClose={() => setIngest(false)} onSuccess={id => { setIngest(false); router.push(`/documents/${id}`); }} />
    <AiSidePanel isOpen={assistant} onClose={() => setAssistant(false)} initialQuestion={question} docId={docId} />
  </div>;
}

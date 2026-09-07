'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowUpRight, FileText, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askDocSetu, getChatHistory } from '@/services/intelligence';
import { ChatMessage } from '@/types/docsetu';

export function Conversation({ docId, initialQuestion, compact = false }: { docId?: string; initialQuestion?: string; compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState('');
  const pending = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const send = useCallback(async (text: string, history: ChatMessage[], session?: string) => {
    if (!text.trim() || pending.current) return;
    pending.current = true; setInput(''); setError(''); setRetry(''); setLoading(true);
    setMessages([...history, { role: 'user', content: text }]);
    try { const response = await askDocSetu({ query: text, docId, sessionId: session, existingMessages: history }); setSessionId(response.sessionId); setMessages([...history, { role: 'user', content: text }, { role: 'assistant', content: response.reply, citations: response.citations }]); }
    catch { setMessages(history); setError('The answer could not be completed. Your question is ready to try again.'); setInput(text); setRetry(text); }
    finally { pending.current = false; setLoading(false); }
  }, [docId]);
  useEffect(() => {
    let cancelled = false;
    setRestoring(true);
    getChatHistory(docId).then(history => {
      if (cancelled) return;
      const restored = [...history.messages];
      // The existing history API stores references for the latest answer.
      const lastAnswer = restored.findLastIndex(m => m.role === 'assistant');
      if (lastAnswer >= 0) restored[lastAnswer] = { ...restored[lastAnswer], citations: history.citations };
      setMessages(restored); setSessionId(history.sessionId || undefined); setRestoring(false);
      if (initialQuestion?.trim()) void send(initialQuestion.trim(), restored, history.sessionId || undefined);
    });
    return () => { cancelled = true; };
  }, [docId, initialQuestion, send]);
  useEffect(() => { if (loading || messages.length) end.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [loading, messages.length]);
  const reset = () => { setMessages([]); setSessionId(crypto.randomUUID()); setInput(''); setError(''); setRetry(''); inputRef.current?.focus(); };
  const suggestions = docId ? ['Summarize this document.', 'Which actions and deadlines are mentioned?', 'What should the responsible team review?'] : ['Which documents need review?', 'What are the procurement approval requirements?', 'Summarize the maintenance obligations.'];
  return <div className={`conversation ${compact ? 'conversation-compact' : ''}`}>
    <div className="conversation-top"><span>{docId ? 'This document' : 'Across your documents'}</span><button className="text-link" onClick={reset} disabled={loading || restoring}><RotateCcw size={13} />New conversation</button></div>
    <div className="conversation-messages" aria-busy={loading || restoring}>
      {restoring ? <div className="empty-state" role="status">Loading conversation…<div className="loading-rule" /></div> : !messages.length && <div className="conversation-empty"><FileText size={28} /><h2>{docId ? 'A question for the source.' : 'What do you need to know?'}</h2><p>{docId ? 'Ask about a requirement, a date, or a passage in this document.' : 'Ask a specific question. Read the answer alongside its references.'}</p><div className="question-options">{suggestions.map(q => <button key={q} onClick={() => void send(q,messages,sessionId)}>{q}<ArrowUpRight size={14} /></button>)}</div></div>}
      {messages.map((message,index) => <article key={index} className={`conversation-message message-${message.role}`}><span className="message-author">{message.role === 'user' ? 'You' : 'DocSetu'}</span><div className="doc-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div>{!!message.citations?.length && <div className="message-sources"><h3>Source references</h3>{message.citations.map((citation,i) => <Link key={`${citation.docId}-${citation.nodeId}-${i}`} href={`/documents/${encodeURIComponent(citation.docId)}?tab=source`}><span className="citation-index">{citation.index}</span><span>{citation.title || 'Source document'}{citation.pageRange && <small>Pages {citation.pageRange.start}–{citation.pageRange.end}</small>}</span><ArrowUpRight size={13} /></Link>)}</div>}</article>)}
      {loading && <div className="answer-loading" role="status"><div className="loading-rule" /><span>Reading the documents and preparing an answer…</span></div>}<div ref={end} />
    </div>
    {error && <p className="notice error" role="alert">{error}{retry && <button className="text-link" onClick={() => void send(retry,messages,sessionId)}>Try again</button>}</p>}
    <form className="conversation-compose" onSubmit={event => { event.preventDefault(); if (!restoring) void send(input.trim(),messages,sessionId); }}><label className="sr-only" htmlFor={compact ? 'drawer-question' : 'workspace-question'}>Your question</label><textarea id={compact ? 'drawer-question' : 'workspace-question'} ref={inputRef} name="question" autoComplete="off" value={input} rows={2} placeholder={docId ? 'Ask about this document…' : 'Ask a question about your documents…'} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (!restoring) void send(input.trim(),messages,sessionId); } }} /><button type="submit" className="button button-primary" disabled={loading || restoring || !input.trim()} aria-label="Send question">{loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={19} />}</button></form><p className="conversation-caution">Check the source before acting on an answer.</p>
  </div>;
}

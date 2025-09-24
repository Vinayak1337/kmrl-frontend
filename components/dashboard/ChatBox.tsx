"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatBox({ docId }: { docId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    const next = [...messages, { role: 'user', content: q } as Message];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: next, docId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      const replyText = data && data.reply && String(data.reply).trim() ? String(data.reply) : null;
      if (replyText) {
        setMessages((m) => [...m, { role: 'assistant', content: replyText }]);
      } else if (Array.isArray(data?.citations) && data.citations.length > 0) {
        setMessages((m) => [...m, { role: 'assistant', content: 'I found matching document passages but could not generate a summary. Try rephrasing your question.' }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: 'No relevant documents found. Upload documents or try a broader query.' }]);
      }
    } catch (err) {
      console.error('Chat error (client):', err);
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I could not answer that.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  return (
    <div className="bg-white rounded-lg shadow-sm border flex flex-col h-[420px]">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">Ask a question about the ingested documents{docId ? ' (this document)' : ''}.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded px-3 py-2 ${m.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="px-3">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Textarea } from '@/components/UI/textarea';

export function FeedbackForm({ docId }: { docId: string }) {
  const [type, setType] = useState('correction');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/documents/${docId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, message, reprocess: true })
      });
      if (!res.ok) throw new Error('Failed');
      setMessage('');
      setStatus('Submitted. Reprocessing triggered.');
    } catch {
      setStatus('Failed to submit feedback.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border">
      <h3 className="text-md font-semibold text-gray-900 mb-2">Submit Feedback</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Type</label>
          <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="correction|missing_data|other" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-600 mb-1">Message</label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue or missing info…" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={sending || !message.trim()}>Submit</Button>
        {status && <span className="text-sm text-gray-600">{status}</span>}
      </div>
    </div>
  );
}


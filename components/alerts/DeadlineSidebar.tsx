'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BellRing, Check, Plus, RotateCw } from 'lucide-react';
import { Modal } from '@/components/workspace/Modal';
import { daysLabel, listDeadlineAlerts, notifyAuthorities, TIER_LABEL, type DeadlineAlert, type DeadlineTier } from '@/services/alerts';

const TIERS: DeadlineTier[] = ['overdue', 'within5', 'within15', 'within30', 'later'];
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const EMAIL = /^[^\s@<>()[\],;:"]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function DeadlineSidebar() {
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [documents, setDocuments] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showAll, setShowAll] = useState(false);
  const [notifying, setNotifying] = useState<DeadlineAlert | null>(null);
  const load = useCallback(() => {
    setState('loading');
    listDeadlineAlerts().then(data => { setAlerts(data.alerts); setDocuments(data.documents); setState('ready'); }).catch(() => setState('error'));
  }, []);
  useEffect(load, [load]);
  const counts = TIERS.map(tier => [tier, alerts.filter(a => a.tier === tier).length] as const).filter(([, n]) => n);
  const visible = showAll ? alerts : alerts.slice(0, 6);

  return <aside className="attention-column deadline-column" aria-labelledby="deadline-heading">
    <div className="section-heading"><h2 id="deadline-heading">Deadlines</h2><button className="icon-button" onClick={load} aria-label="Refresh deadlines" disabled={state === 'loading'}><RotateCw size={16} /></button></div>
    {state === 'loading' ? <div className="skeleton-list" role="status" aria-label="Loading deadlines"><div /><div /><div /></div>
      : state === 'error' ? <div className="notice error" role="alert">Could not load deadlines. <button className="text-link" onClick={load}>Try again</button></div>
      : !alerts.length ? <p className="empty-state">No upcoming deadlines found in your documents.</p>
      : <>
        <p className="deadline-summary"><strong>{alerts.length}</strong> {alerts.length === 1 ? 'deadline' : 'deadlines'} across {documents} {documents === 1 ? 'document' : 'documents'}</p>
        <ul className="tier-legend" aria-label="Deadlines by time left">{counts.map(([tier, n]) => <li key={tier} className={`tier-${tier}`}><span aria-hidden="true" />{TIER_LABEL[tier]} · {n}</li>)}</ul>
        <ol className="deadline-list">{visible.map(alert => <li key={alert.id} className={`deadline-item tier-${alert.tier}`}>
          <div className="deadline-when"><time dateTime={alert.date}>{formatDate(alert.date)}</time><span>{daysLabel(alert.daysLeft)}</span></div>
          <p className="deadline-requirement">{alert.requirement}</p>
          <Link href={`/documents/${alert.documentId}`} className="deadline-source">{alert.documentTitle}{alert.pageStart ? ` · p. ${alert.pageStart}${alert.pageEnd && alert.pageEnd !== alert.pageStart ? `–${alert.pageEnd}` : ''}` : ''}</Link>
          {alert.authorities.length > 0 && <p className="deadline-authorities">{alert.authorities.length} {alert.authorities.length === 1 ? 'authority' : 'authorities'} found: {alert.authorities.slice(0, 2).map(a => a.label || a.email).join(', ')}{alert.authorities.length > 2 ? '…' : ''}</p>}
          <div className="deadline-actions">
            <button className="text-link" onClick={() => setNotifying(alert)}><BellRing size={14} />Inform authorities</button>
            {alert.notifications.length > 0 && <span className="deadline-informed"><Check size={13} />{new Set(alert.notifications.flatMap(n => n.recipients)).size} informed</span>}
          </div>
        </li>)}</ol>
        {alerts.length > 6 && <button className="text-link deadline-more" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show fewer' : `Show all ${alerts.length} deadlines`}<ArrowRight size={14} /></button>}
      </>}
    <NotifyDialog alert={notifying} onClose={() => setNotifying(null)} onRecorded={load} />
  </aside>;
}

function NotifyDialog({ alert, onClose, onRecorded }: { alert: DeadlineAlert | null; onClose: () => void; onRecorded: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ recorded: string[]; duplicates: string[] } | null>(null);
  useEffect(() => {
    setSelected(alert?.authorities.slice(0, 1).map(a => a.email) || []); setExtra([]); setDraft(''); setNote(''); setError(''); setResult(null);
  }, [alert]);
  if (!alert) return <Modal open={false} onClose={onClose} title="Inform authorities"><span /></Modal>;
  const informed = new Set(alert.notifications.flatMap(n => n.recipients));
  const addDraft = () => {
    const emails = draft.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    const invalid = emails.filter(e => !EMAIL.test(e));
    if (invalid.length) { setError(`Check ${invalid.join(', ')}`); return false; }
    const known = new Set([...alert.authorities.map(a => a.email), ...extra]);
    setExtra([...extra, ...emails.filter(e => !known.has(e))]);
    setSelected([...new Set([...selected, ...emails])]);
    setDraft(''); setError('');
    return true;
  };
  const toggle = (email: string) => setSelected(selected.includes(email) ? selected.filter(e => e !== email) : [...selected, email]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.trim() && !addDraft()) return;
    const recipients = [...new Set([...selected, ...draft.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => EMAIL.test(e))])];
    if (!recipients.length) { setError('Choose or add at least one email address.'); return; }
    setBusy(true); setError('');
    try { setResult(await notifyAuthorities(alert.id, recipients, note)); onRecorded(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not record the notification'); }
    finally { setBusy(false); }
  };
  const recipientRow = (email: string, label?: string) => <label key={email} className="recipient-option"><input type="checkbox" checked={selected.includes(email)} onChange={() => toggle(email)} /><span><strong>{label || email}</strong>{label && <small>{email}</small>}</span>{informed.has(email) && <em>Informed</em>}</label>;

  return <Modal open onClose={onClose} busy={busy} title="Inform authorities" description={`${TIER_LABEL[alert.tier]} · ${daysLabel(alert.daysLeft)}`}>
    {result ? <div className="notify-result" role="status">
      <Check size={26} />
      <h3>{result.recorded.length ? `Notification recorded for ${result.recorded.length} ${result.recorded.length === 1 ? 'person' : 'people'}` : 'Everyone selected was already informed'}</h3>
      {result.duplicates.length > 0 && <p>Already informed about this deadline: {result.duplicates.join(', ')}</p>}
      <p className="notice">Email delivery is still being set up (SMTP is not connected yet). The request is saved and linked to this deadline.</p>
      <div className="modal-actions"><button className="button button-primary" onClick={onClose}>Done</button></div>
    </div> : <form className="form-stack notify-form" onSubmit={submit}>
      <blockquote className="notify-deadline"><time dateTime={alert.date}>{formatDate(alert.date)}</time><p>{alert.requirement}</p><cite>{alert.documentTitle}{alert.pageStart ? ` · p. ${alert.pageStart}` : ''}</cite></blockquote>
      <fieldset className="recipient-list"><legend>Concerned authorities{alert.authorities.length > 0 && <span className="field-help"> · found in the document, nearest first</span>}</legend>
        {alert.authorities.length ? alert.authorities.map(a => recipientRow(a.email, a.label)) : <p className="muted">No email addresses were found in this document. Add one below.</p>}
        {extra.map(email => recipientRow(email))}
      </fieldset>
      <label>Add someone else<span className="add-recipient"><input type="email" inputMode="email" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); addDraft(); } }} placeholder="name@organisation.in" autoComplete="email" /><button type="button" className="button" onClick={addDraft} disabled={!draft.trim()}><Plus size={15} />Add</button></span></label>
      <label>Note <span className="field-help">optional</span><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="Add context for the recipients" /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button button-primary" disabled={busy}><BellRing size={15} />{busy ? 'Recording…' : `Inform ${selected.length || ''}`.trim()}</button></div>
    </form>}
  </Modal>;
}

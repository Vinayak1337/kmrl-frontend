'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Modal } from '@/components/workspace/Modal';
import { CLASSIFICATION_DEPARTMENTS, CLASSIFICATION_TYPES, classificationTypeValue } from '@/lib/ingest/classification';
import { getDocumentClassification, saveDocumentClassification, type DocumentClassification } from '@/services/documents';

type Values = DocumentClassification['effective'];
const label = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const description = (values: Values) => [values.department && label(values.department),
  values.documentType && label(values.documentType), ...values.tags].filter(Boolean).join(' · ') || 'Unclassified';
const formatDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function options(values: readonly string[], current: string | null, original: string | null) {
  return [...new Set([original, current, ...values].filter((value): value is string => value !== null))];
}

export function DocumentClassificationDialog({ id, open, close, onSaved }: {
  id: string;
  open: boolean;
  close: () => void;
  onSaved: () => void;
}) {
  const [record, setRecord] = useState<DocumentClassification | null>(null);
  const [draft, setDraft] = useState<Values | null>(null);
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const running = record?.processing?.status === 'queued' || record?.processing?.status === 'processing';
  const onSavedRef = useRef(onSaved);
  useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getDocumentClassification(id, controller.signal).then(result => {
      setRecord(result);
      const initial = result.processing?.target || result.effective;
      setDraft(initial);
      setTags(initial.tags.join('\n'));
      setNote(result.processing?.note || '');
    }).catch(() => {
      if (!controller.signal.aborted) setError('Could not load classification. Close and reopen this dialog to retry.');
    });
    return () => controller.abort();
  }, [id, open]);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const next = await getDocumentClassification(id, controller.signal);
        if (controller.signal.aborted) return;
        setRecord(next);
        if (next.processing?.status === 'queued' || next.processing?.status === 'processing') {
          timer = setTimeout(refresh, 3000);
        } else if (!next.processing || next.processing.status === 'completed') {
          setDraft(next.effective);
          setTags(next.effective.tags.join('\n'));
          setNote('');
          setSaved(true);
          onSavedRef.current();
        }
      } catch {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 5000);
      }
    };
    timer = setTimeout(refresh, 2500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [id, running]);

  const closeDialog = () => {
    if (!running) { setRecord(null); setDraft(null); setNote(''); }
    setError('');
    setSaved(false);
    close();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || busy || running) return;
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      const result = await saveDocumentClassification(id, {
        ...draft, tags: tags.split('\n').map(tag => tag.trim()).filter(Boolean), note: note.trim(),
      });
      setRecord(result);
      if (!result.processing) {
        setDraft(result.effective);
        setTags(result.effective.tags.join('\n'));
        setNote('');
        setSaved(true);
        onSavedRef.current();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save classification.');
    } finally {
      setBusy(false);
    }
  };

  return <Modal open={open} onClose={closeDialog} title="Document classification" busy={busy}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {saved && <p className="notice" role="status">Classification saved.</p>}
    {running && <p className="notice" role="status">Rebuilding the document from its original source. You can close this window while it runs.</p>}
    {record?.processing?.status === 'failed' && <p className="notice error" role="alert">{record.processing.error || 'Rebuilding failed. Save the correction again to retry.'}</p>}
    {!record && !error && <p role="status" className="muted">Loading classification…</p>}
    {record && draft && <>
      <section className="reader-block">
        <h3>AI suggestion</h3>
        <p className="muted">{record.suggestion ? description(record.suggestion) : 'No suggestion is available for this document.'}</p>
        {record.suggestion && record.canEdit && <button className="button" disabled={busy || running} onClick={() => {
          const suggestion = record.suggestion;
          if (!suggestion) return;
          setDraft({
            department: suggestion.department ?? draft.department,
            documentType: suggestion.documentType ?? draft.documentType,
            tags: suggestion.tags.length ? suggestion.tags : draft.tags,
          });
          if (suggestion.tags.length) setTags(suggestion.tags.join('\n'));
          setSaved(false);
        }}>Use suggestion</button>}
      </section>
      {record.canEdit
        ? <form className="form-stack" onSubmit={save}>
          <p className="muted" id="classification-access">Saving a correction rebuilds the summary, sections, actions, and search data. Changing the team or type can change who can read this document.</p>
          <div className="form-columns" aria-describedby="classification-access">
            <label>Team<select value={draft.department ?? ''} disabled={busy || running} onChange={event => {
              setDraft({ ...draft, department: event.target.value || null }); setSaved(false);
            }}>
              {record.effective.department === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_DEPARTMENTS, draft.department, record.effective.department).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
            <label>Document type<select value={draft.documentType ?? ''} disabled={busy || running} onChange={event => {
              setDraft({ ...draft, documentType: event.target.value || null }); setSaved(false);
            }}>
              {record.effective.documentType === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_TYPES.map(classificationTypeValue), draft.documentType, record.effective.documentType).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
          </div>
          <label>Tags<textarea rows={4} value={tags} disabled={busy || running} onChange={event => { setTags(event.target.value); setSaved(false); }} />
            <span className="field-help">Enter one tag per line.</span>
          </label>
          <label>Correction note (optional)<textarea rows={3} value={note} maxLength={1000} disabled={busy || running} onChange={event => { setNote(event.target.value); setSaved(false); }} />
            <span className="field-help">Describe what the document analysis missed or got wrong.</span>
          </label>
          <div className="modal-actions"><button type="submit" className="button button-primary" disabled={busy || running}>{busy ? 'Saving…' : 'Save classification'}</button></div>
        </form>
        : <section className="reader-block"><h3>Current classification</h3><p>{description(record.effective)}</p></section>}
      {record.history.length > 0 && <section className="reader-block">
        <h3>Correction history</h3>
        <ul className="reader-points">{[...record.history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`}>
          <time dateTime={entry.at}>{formatDate.format(new Date(entry.at))}</time>
          <div>{description(entry.before)} → {description(entry.after)}</div>
          {entry.note && <p>{entry.note}</p>}
        </li>)}</ul>
      </section>}
    </>}
  </Modal>;
}

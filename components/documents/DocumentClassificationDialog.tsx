'use client';

import { useEffect, useState, type FormEvent } from 'react';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getDocumentClassification(id, controller.signal).then(result => {
      setRecord(result);
      setDraft(result.effective);
      setTags(result.effective.tags.join(', '));
    }).catch(() => {
      if (!controller.signal.aborted) setError('Could not load classification. Close and reopen this dialog to retry.');
    });
    return () => controller.abort();
  }, [id, open]);

  const closeDialog = () => {
    setRecord(null);
    setDraft(null);
    setError('');
    setSaved(false);
    close();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      const result = await saveDocumentClassification(id, {
        ...draft, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
      setRecord(result);
      setDraft(result.effective);
      setTags(result.effective.tags.join(', '));
      setSaved(true);
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save classification.');
    } finally {
      setBusy(false);
    }
  };

  return <Modal open={open} onClose={closeDialog} title="Document classification" busy={busy}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {saved && <p className="notice" role="status">Classification saved.</p>}
    {!record && !error && <p role="status" className="muted">Loading classification…</p>}
    {record && draft && <>
      <section className="reader-block">
        <h3>AI suggestion</h3>
        <p className="muted">{record.suggestion ? description(record.suggestion) : 'No suggestion is available for this document.'}</p>
        {record.suggestion && record.canEdit && <button className="button" disabled={busy} onClick={() => {
          const suggestion = record.suggestion;
          if (!suggestion) return;
          setDraft({
            department: suggestion.department ?? draft.department,
            documentType: suggestion.documentType ?? draft.documentType,
            tags: suggestion.tags.length ? suggestion.tags : draft.tags,
          });
          if (suggestion.tags.length) setTags(suggestion.tags.join(', '));
          setSaved(false);
        }}>Use suggestion</button>}
      </section>
      {record.canEdit
        ? <form className="form-stack" onSubmit={save}>
          <p className="muted" id="classification-access">Changing the team or type can change who can read this document.</p>
          <div className="form-columns" aria-describedby="classification-access">
            <label>Team<select value={draft.department ?? ''} disabled={busy} onChange={event => {
              setDraft({ ...draft, department: event.target.value || null }); setSaved(false);
            }}>
              {record.effective.department === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_DEPARTMENTS, draft.department, record.effective.department).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
            <label>Document type<select value={draft.documentType ?? ''} disabled={busy} onChange={event => {
              setDraft({ ...draft, documentType: event.target.value || null }); setSaved(false);
            }}>
              {record.effective.documentType === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_TYPES.map(classificationTypeValue), draft.documentType, record.effective.documentType).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
          </div>
          <label>Tags<input value={tags} disabled={busy} onChange={event => { setTags(event.target.value); setSaved(false); }} />
            <span className="field-help">Separate tags with commas.</span>
          </label>
          <div className="modal-actions"><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save classification'}</button></div>
        </form>
        : <section className="reader-block"><h3>Current classification</h3><p>{description(record.effective)}</p></section>}
      {record.history.length > 0 && <section className="reader-block">
        <h3>Correction history</h3>
        <ul className="reader-points">{[...record.history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`}>
          <time dateTime={entry.at}>{formatDate.format(new Date(entry.at))}</time>
          <div>{description(entry.before)} → {description(entry.after)}</div>
        </li>)}</ul>
      </section>}
    </>}
  </Modal>;
}

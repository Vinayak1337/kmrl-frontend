'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { stageLabel } from './ingestProgress';
import { Modal } from '@/components/workspace/Modal';
import { CLASSIFICATION_DEPARTMENTS, CLASSIFICATION_TYPES, classificationTypeValue } from '@/lib/ingest/classification';
import { getDocumentClassification, saveDocumentClassification, saveSummaryCorrection, type DocumentClassification } from '@/services/documents';

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
  const [target, setTarget] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const running = record?.processing?.status === 'queued' || record?.processing?.status === 'processing';
  const onSavedRef = useRef(onSaved);
  useEffect(() => { onSavedRef.current = onSaved; }, [onSaved]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    getDocumentClassification(id, controller.signal).then(result => {
      setRecord(result);
      const initial = result.effective;
      setDraft(initial);
      setTags(initial.tags.join('\n'));
      setNote(result.processing?.note || '');
      const scope = result.processing?.scope;
      setTarget(scope?.kind === 'brief' ? 'brief' : scope?.nodeId || 'auto');
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
          setNote('');
          setTarget('auto');
          setSaved('Correction applied.');
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
    if (!running) { setRecord(null); setDraft(null); setNote(''); setTarget('auto'); }
    setError('');
    setSaved('');
    close();
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || busy || running) return;
    setBusy(true);
    setSaved('');
    setError('');
    try {
      const result = await saveDocumentClassification(id, {
        ...draft, tags: tags.split('\n').map(tag => tag.trim()).filter(Boolean),
      });
      setRecord(previous => ({ ...result, targets: previous?.targets }));
      setDraft(result.effective);
      setTags(result.effective.tags.join('\n'));
      setSaved('Classification saved.');
      onSavedRef.current();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save classification.');
    } finally {
      setBusy(false);
    }
  };

  const submitCorrection = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim() || busy || running) return;
    setBusy(true);
    setSaved('');
    setError('');
    try {
      setRecord(await saveSummaryCorrection(id, note.trim(), target));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save the correction.');
    } finally {
      setBusy(false);
    }
  };

  return <Modal open={open} onClose={closeDialog} title="Document classification" busy={busy}>
    {error && <p className="notice error" role="alert">{error}</p>}
    {saved && <p className="notice" role="status">{saved}</p>}
    {running && <p className="notice" role="status">Rebuilding {record?.processing?.scope?.kind === 'brief' ? 'the document brief' : 'the source section'}. {record?.processing?.stage ? stageLabel(record.processing.stage, record.processing.analysis) : 'Waiting to process…'} You can close this window while it runs.</p>}
    {record?.processing?.status === 'failed' && <p className="notice error" role="alert">{record.processing.error || 'The correction failed. Save it again to retry.'}</p>}
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
          setSaved('');
        }}>Use suggestion</button>}
      </section>
      {record.canEdit
        ? <><form className="form-stack" onSubmit={save}>
          <p className="muted" id="classification-access">Changing the team or type can change who can read this document.</p>
          <div className="form-columns" aria-describedby="classification-access">
            <label>Team<select value={draft.department ?? ''} disabled={busy || running} onChange={event => {
              setDraft({ ...draft, department: event.target.value || null }); setSaved('');
            }}>
              {record.effective.department === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_DEPARTMENTS, draft.department, record.effective.department).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
            <label>Document type<select value={draft.documentType ?? ''} disabled={busy || running} onChange={event => {
              setDraft({ ...draft, documentType: event.target.value || null }); setSaved('');
            }}>
              {record.effective.documentType === null && <option value="">Unclassified</option>}
              {options(CLASSIFICATION_TYPES.map(classificationTypeValue), draft.documentType, record.effective.documentType).map(value => <option key={value} value={value}>{label(value)}</option>)}
            </select></label>
          </div>
          <label>Tags<textarea rows={4} value={tags} disabled={busy || running} onChange={event => { setTags(event.target.value); setSaved(''); }} />
            <span className="field-help">Enter one tag per line.</span>
          </label>
          <div className="modal-actions"><button type="submit" className="button button-primary" disabled={busy || running}>Save classification</button></div>
        </form>
        <form className="form-stack reader-block" onSubmit={submitCorrection}>
          <h3>Correct a summary</h3>
          <label>What should be rebuilt?<select value={target} disabled={busy || running} onChange={event => setTarget(event.target.value)}>
            <option value="auto">Find the target from the note</option>
            <option value="brief">Document brief</option>
            {record.targets?.map(section => <option key={section.nodeId} value={section.nodeId}>
              {section.title || 'Section'} · {section.pageRange.start === section.pageRange.end ? `Page ${section.pageRange.start}` : `Pages ${section.pageRange.start}–${section.pageRange.end}`}
            </option>)}
          </select></label>
          <label>Correction note<textarea rows={3} value={note} maxLength={1000} required disabled={busy || running} onChange={event => { setNote(event.target.value); setSaved(''); }} />
            <span className="field-help">Describe what’s wrong and name the page or document brief.</span>
          </label>
          <div className="modal-actions"><button type="submit" className="button button-primary" disabled={busy || running || !note.trim()}>Save correction</button></div>
        </form></>
        : <section className="reader-block"><h3>Current classification</h3><p>{description(record.effective)}</p></section>}
      {record.history.length > 0 && <section className="reader-block">
        <h3>Correction history</h3>
        <ul className="reader-points">{[...record.history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`}>
          <time dateTime={entry.at}>{formatDate.format(new Date(entry.at))}</time>
          <div>{entry.scope?.kind === 'brief' ? 'Document brief corrected' : entry.scope?.kind === 'section' ? 'Section summary corrected' : `${description(entry.before)} → ${description(entry.after)}`}</div>
          {entry.note && <p>{entry.note}</p>}
        </li>)}</ul>
      </section>}
    </>}
  </Modal>;
}

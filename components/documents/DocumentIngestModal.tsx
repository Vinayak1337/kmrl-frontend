'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, FileText, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/workspace/Modal';
import { DocSetuLoadingIndicator } from '@/components/brand/DocSetuBrand';
import { VALID_TEAMS, VALID_DOC_TYPES } from '@/adapters/documentAdapter';
import { uploadDocument, IngestDocumentPayload } from '@/services/documents';

type Step = 'file' | 'metadata' | 'processing' | 'done';
export function DocumentIngestModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: (id: string) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('file');
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [team, setTeam] = useState('Operations');
  const [type, setType] = useState('Policy');
  const [language, setLanguage] = useState('English');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [newId, setNewId] = useState('');
  const [reading, setReading] = useState(false);
  const [discard, setDiscard] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = !!(file || text || title);
  useEffect(() => {
    if (!isOpen || !dirty || step === 'done') return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard);
  }, [isOpen, dirty, step]);
  const reset = () => { setStep('file'); setMode('upload'); setFile(null); setContent(''); setText(''); setTitle(''); setTeam('Operations'); setType('Policy'); setLanguage('English'); setTags(''); setError(''); setNewId(''); setDiscard(false); };
  const close = () => { if (step === 'processing') return; if (dirty && step !== 'done') { setDiscard(true); return; } reset(); onClose(); };
  const selectFile = async (selected: File) => {
    setError('');
    if (!/\.(pdf|docx?|txt|md|png|jpe?g|html?)$/i.test(selected.name)) { setError('Choose a PDF, Word document, image, or text file.'); return; }
    setReading(true); setFile(selected); setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '));
    try {
      if (/\.(txt|md|html?)$/i.test(selected.name)) setContent(await selected.text());
      else setContent(await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.onerror = () => reject(new Error('Could not read file')); reader.readAsDataURL(selected); }));
      setStep('metadata');
    } catch { setError('Could not read this file. Please choose it again.'); }
    finally { setReading(false); }
  };
  const process = async (event: React.FormEvent) => {
    event.preventDefault(); if (!title.trim()) { setError('Enter a document title.'); return; }
    setError(''); setStep('processing');
    const extension = file?.name.split('.').pop()?.toLowerCase();
    const format: IngestDocumentPayload['format'] = mode === 'paste' ? 'text' : extension === 'pdf' ? 'pdf' : ['png','jpg','jpeg'].includes(extension || '') ? 'image' : ['doc','docx'].includes(extension || '') ? 'doc' : ['html','htm'].includes(extension || '') ? 'html' : 'text';
    try { const result = await uploadDocument({ title: title.trim(), team, type, language, tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), fileContent: mode === 'upload' ? content : undefined, fileName: mode === 'upload' ? file?.name : undefined, format, text: mode === 'paste' ? text : undefined }); setNewId(result.id); setStep('done'); }
    catch { setError('The document could not be added. Check the file and try again.'); setStep('metadata'); }
  };
  return <Modal open={isOpen} onClose={close} title="Add document" description="Add a source to your workspace." busy={step === 'processing' || reading}>
    {discard ? <><h3 className="form-subheading">Discard this draft?</h3><p className="muted">Your file selection and document details have not been saved.</p><div className="modal-actions"><button className="button" onClick={() => setDiscard(false)}>Keep editing</button><button className="button button-danger" onClick={() => { reset(); onClose(); }}>Discard draft</button></div></> : <>
    {step !== 'processing' && step !== 'done' && <ol className="ingest-steps" aria-label="Add document progress"><li aria-current={step === 'file' ? 'step' : undefined}>Choose source</li><li aria-current={step === 'metadata' ? 'step' : undefined}>Document details</li></ol>}
    {error && <p className="notice error" role="alert">{error}</p>}
    {step === 'file' && <><div className="document-tabs ingest-tabs"><button aria-pressed={mode === 'upload'} onClick={() => { setMode('upload'); setError(''); }}>Upload file</button><button aria-pressed={mode === 'paste'} onClick={() => { setMode('paste'); setError(''); }}>Paste text</button></div>{mode === 'upload' ? <div className="upload-zone" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) void selectFile(e.dataTransfer.files[0]); }}><Upload size={30} /><h3>Bring a document in.</h3><p>Drop a file here, or choose one from your device.</p><input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.html,.htm" className="sr-only" tabIndex={-1} aria-label="Document file" onChange={e => { if (e.target.files?.[0]) void selectFile(e.target.files[0]); }} /><button className="button" onClick={() => fileRef.current?.click()} disabled={reading}>{reading ? 'Reading file…' : 'Choose file'}</button><span>PDF, Word, image, or text</span></div> : <form className="form-stack" onSubmit={event => { event.preventDefault(); if (!text.trim()) { setError('Paste some document text to continue.'); return; } setError(''); setTitle(title || 'Untitled document'); setStep('metadata'); }}><label>Document text<textarea name="document-text" value={text} onChange={e => setText(e.target.value)} rows={8} placeholder="Paste the document text here…" required /></label><button className="button button-primary" type="submit">Continue to details <ArrowRight size={15} /></button></form>}</>}
    {step === 'metadata' && <form className="form-stack" onSubmit={process}><div className="ingest-source"><FileText size={17} /><span>{mode === 'upload' ? file?.name : 'Pasted text'}</span></div><label>Document title<input name="document-title" autoComplete="off" required value={title} onChange={e => setTitle(e.target.value)} /></label><div className="form-columns"><label>Team<select value={team} onChange={e => setTeam(e.target.value)}>{VALID_TEAMS.map(t => <option key={t}>{t}</option>)}</select></label><label>Document type<select value={type} onChange={e => setType(e.target.value)}>{VALID_DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select></label></div><div className="form-columns"><label>Language<select value={language} onChange={e => setLanguage(e.target.value)}>{['English','Hindi','Malayalam','Tamil'].map(l => <option key={l}>{l}</option>)}</select></label><label>Tags<input name="tags" autoComplete="off" value={tags} onChange={e => setTags(e.target.value)} placeholder="Safety, review…" /><span className="field-help">Separate tags with commas.</span></label></div><div className="modal-actions"><button type="button" className="button" onClick={() => setStep('file')}>Back</button><button type="submit" className="button button-primary">Add document <ArrowRight size={15} /></button></div></form>}
    {step === 'processing' && <div className="ingest-processing"><DocSetuLoadingIndicator text="Preparing your document…" /><p>Reading the content and preparing sections, a summary, and actions. Keep this window open until the document is saved.</p></div>}
    {step === 'done' && <div className="ingest-success" role="status"><Check size={30} /><h3>Document added</h3><p>{title}</p><div className="modal-actions"><button className="button" onClick={reset}>Add another</button><button className="button button-primary" onClick={() => { const id = newId; reset(); onSuccess?.(id); onClose(); router.push(`/documents/${id}`); }}>Open document <ArrowRight size={15} /></button></div></div>}
    </>}
  </Modal>;
}

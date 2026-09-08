'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Native dialog supplies focus containment, Escape handling and focus restoration. */
export function Modal({ open, onClose, title, description, children, wide = false, busy = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} className={`desk-modal ${wide ? 'desk-modal-wide' : ''}`} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === ref.current && !busy) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><header className="modal-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} disabled={busy}><X size={19} /></button></header><div className="modal-content">{open && children}</div></dialog>;
}

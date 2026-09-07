'use client';
import { Modal } from '@/components/workspace/Modal';
import { Conversation } from '@/components/workspace/Conversation';

export function AiSidePanel({ isOpen, onClose, docId, docTitle, initialQuestion }: { isOpen: boolean; onClose: () => void; docId?: string; docTitle?: string; initialQuestion?: string }) {
  return <Modal open={isOpen} onClose={onClose} title="Ask DocSetu" description={docTitle || (docId ? 'Questions about the selected document.' : 'Questions across your document collection.')} wide><Conversation docId={docId} initialQuestion={initialQuestion} compact /></Modal>;
}

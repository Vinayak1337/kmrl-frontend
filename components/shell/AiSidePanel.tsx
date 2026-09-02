'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { X, Send, Sparkles, Loader2, BookOpen, RefreshCw } from 'lucide-react';
import { DocSetuSymbol } from '@/components/brand/DocSetuBrand';
import { askDocSetu, getChatHistory } from '@/services/intelligence';
import { ChatMessage, Citation } from '@/types/docsetu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiSidePanelProps {
	isOpen: boolean;
	onClose: () => void;
	docId?: string;
	docTitle?: string;
	initialQuestion?: string;
}

export function AiSidePanel({
	isOpen,
	onClose,
	docId,
	docTitle,
	initialQuestion
}: AiSidePanelProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [, setCitations] = useState<Citation[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Load session history when opening
	useEffect(() => {
		if (!isOpen) return;

		const loadHistory = async () => {
			try {
				const history = await getChatHistory(docId);
				if (history.messages.length > 0) {
					setMessages(history.messages);
					setCitations(history.citations);
					setSessionId(history.sessionId);
				} else {
					setMessages([]);
					setCitations([]);
				}
			} catch (err) {
				console.warn('Failed to load chat history', err);
			}
		};

		void loadHistory();
	}, [isOpen, docId]);

	const handleSend = useCallback(
		async (queryText?: string) => {
			const text = (queryText || input).trim();
			if (!text || loading) return;

			setInput('');
			setLoading(true);

			const updatedMessages: ChatMessage[] = [
				...messages,
				{ role: 'user', content: text, timestamp: new Date() }
			];
			setMessages(updatedMessages);

			try {
				const res = await askDocSetu({
					query: text,
					docId,
					sessionId: sessionId || undefined,
					existingMessages: messages
				});

				setSessionId(res.sessionId);
				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content: res.reply,
						citations: res.citations,
						timestamp: new Date()
					}
				]);
				if (res.citations && res.citations.length > 0) {
					setCitations(res.citations);
				}
			} catch {
				setMessages(prev => [
					...prev,
					{
						role: 'assistant',
						content:
							'I encountered an issue retrieving an answer from the source documents. Please try rephrasing your question.',
						timestamp: new Date()
					}
				]);
			} finally {
				setLoading(false);
			}
		},
		[input, loading, messages, docId, sessionId]
	);

	// Auto-submit initial question if provided
	useEffect(() => {
		if (isOpen && initialQuestion && initialQuestion.trim() && !loading) {
			void handleSend(initialQuestion.trim());
		}
	}, [isOpen, initialQuestion, handleSend, loading]);

	// Scroll to bottom on messages update
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	if (!isOpen) return null;

	return (
		<div className='fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200'>
			{/* Backdrop */}
			<div
				className='fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity'
				onClick={onClose}
			/>

			{/* Slide-over Drawer */}
			<div className='relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full z-10 border-l border-[#E1E4DF]'>
				{/* Drawer Header */}
				<div className='flex items-center justify-between px-5 py-4 border-b border-[#E1E4DF] bg-[#F6F7F4]/70'>
					<div className='flex items-center gap-2.5'>
						<div className='w-8 h-8 rounded-lg bg-white border border-[#E1E4DF] flex items-center justify-center shadow-2xs'>
							<DocSetuSymbol size='sm' />
						</div>
						<div>
							<h2 className='text-sm font-semibold text-[#172033] flex items-center gap-1.5'>
								<span>{docTitle ? 'Ask this document' : 'Ask DocSetu'}</span>
							</h2>
							<p className='text-[11px] text-[#677080] truncate max-w-[280px]'>
								{docTitle || 'Grounded intelligence across workspace sources'}
							</p>
						</div>
					</div>

					<div className='flex items-center gap-1'>
						<button
							onClick={() => {
								setMessages([]);
								setCitations([]);
								setSessionId(null);
							}}
							title='Clear session'
							className='p-1.5 text-[#9098A5] hover:text-[#172033] rounded-md hover:bg-white transition-colors'>
							<RefreshCw className='h-4 w-4' />
						</button>
						<button
							onClick={onClose}
							className='p-1.5 text-[#9098A5] hover:text-[#172033] rounded-md hover:bg-white transition-colors'>
							<X className='h-5 w-5' />
						</button>
					</div>
				</div>

				{/* Messages Area */}
				<div className='flex-1 overflow-y-auto p-5 space-y-4 bg-white'>
					{messages.length === 0 && (
						<div className='py-8 text-center px-4'>
							<div className='w-12 h-12 rounded-full bg-[#4656D9]/10 text-[#4656D9] flex items-center justify-center mx-auto mb-3'>
								<Sparkles className='h-6 w-6' />
							</div>
							<h3 className='text-sm font-semibold text-[#172033] mb-1'>
								Ask anything {docTitle ? 'about this document' : 'across your workspace'}
							</h3>
							<p className='text-xs text-[#677080] max-w-xs mx-auto mb-6 leading-relaxed'>
								Answers are synthesized directly from verified document sections with citations.
							</p>

							{/* Suggested Questions */}
							<div className='space-y-2 text-left'>
								<p className='text-[11px] font-semibold text-[#9098A5] uppercase tracking-wider px-1'>
									Suggested Questions
								</p>
								{(docTitle
									? [
											'What are the key obligations and deadlines?',
											'Who are the affected teams and responsibilities?',
											'Summarize the approval requirements in this document.'
									  ]
									: [
											'Which vendor agreements require action this month?',
											'What are the latest procurement approval limits?',
											'Which circulars introduce compliance deadlines soon?'
									  ]
								).map((q, idx) => (
									<button
										key={idx}
										onClick={() => handleSend(q)}
										className='w-full text-left p-2.5 rounded-lg border border-[#E1E4DF] bg-[#F6F7F4]/50 hover:bg-[#F1F3F1] hover:border-[#CBD5E1] text-xs text-[#172033] font-medium transition-colors'>
										&ldquo;{q}&rdquo;
									</button>
								))}
							</div>
						</div>
					)}

					{messages.map((m, idx) => (
						<div
							key={idx}
							className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
							<div
								className={`max-w-[90%] rounded-xl px-4 py-3 text-sm shadow-xs ${
									m.role === 'user'
										? 'bg-[#4656D9] text-white'
										: 'bg-[#F6F7F4] text-[#172033] border border-[#E1E4DF]'
								}`}>
								{m.role === 'assistant' ? (
									<div className='prose prose-xs max-w-none text-[#172033] leading-relaxed'>
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{m.content}
										</ReactMarkdown>
									</div>
								) : (
									<p className='whitespace-pre-wrap leading-relaxed'>{m.content}</p>
								)}

								{/* Sources Citations */}
								{m.citations && m.citations.length > 0 && (
									<div className='mt-3 pt-2.5 border-t border-[#E1E4DF] space-y-1.5'>
										<div className='text-[10px] font-semibold tracking-wider text-[#677080] uppercase'>
											Citations
										</div>
										<div className='flex flex-wrap gap-1.5'>
											{m.citations.map((c, cIdx) => (
												<Link
													key={cIdx}
													href={`/documents/${c.docId}`}
													className='inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#E1E4DF] text-[11px] text-[#4656D9] font-medium hover:border-[#4656D9] transition-colors'>
													<BookOpen className='h-3 w-3 text-[#179C8C]' />
													<span>{c.title || `Section ${c.index}`}</span>
													{c.pageRange?.start && (
														<span className='text-[#9098A5]'>
															(p. {c.pageRange.start}
															{c.pageRange.end && c.pageRange.end !== c.pageRange.start
																? `–${c.pageRange.end}`
																: ''}
															)
														</span>
													)}
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					))}

					{loading && (
						<div className='flex items-center gap-2 p-3 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] text-xs text-[#677080] w-fit'>
							<Loader2 className='h-3.5 w-3.5 animate-spin text-[#4656D9]' />
							<span>Searching document sections…</span>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Bar */}
				<div className='p-4 border-t border-[#E1E4DF] bg-white'>
					<form
						onSubmit={e => {
							e.preventDefault();
							handleSend();
						}}
						className='relative flex items-center'>
						<input
							type='text'
							value={input}
							onChange={e => setInput(e.target.value)}
							placeholder='Ask a follow-up question…'
							disabled={loading}
							className='w-full pl-3.5 pr-11 py-2.5 text-sm bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9] focus:bg-white transition-all'
						/>
						<button
							type='submit'
							disabled={loading || !input.trim()}
							className='absolute right-1.5 p-1.5 rounded-md bg-[#4656D9] text-white hover:bg-[#3B4BBF] disabled:opacity-40 disabled:hover:bg-[#4656D9] transition-colors'>
							{loading ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<Send className='h-4 w-4' />
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

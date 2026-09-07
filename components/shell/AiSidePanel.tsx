'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { X, Send, Sparkles, Loader2, BookOpen, RefreshCw, Cpu } from 'lucide-react';
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
							'I encountered an issue synthesizing an answer from the source documents. Please try rephrasing your question.',
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
				className='fixed inset-0 bg-black/20 backdrop-blur-xs transition-opacity'
				onClick={onClose}
			/>

			{/* Slide-over Drawer */}
			<div className='relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full z-10 border-l border-[#E5E7EB]'>
				{/* Drawer Header */}
				<div className='flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] bg-[#FAFAFA]'>
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center shadow-xs'>
							<DocSetuSymbol size='sm' />
						</div>
						<div>
							<h2 className='text-sm font-semibold text-[#111827] flex items-center gap-1.5'>
								<span>{docTitle ? 'Document Intelligence' : 'DocSetu AI Assistant'}</span>
							</h2>
							<div className='flex items-center gap-1.5 text-[11px] text-[#6B7280]'>
								<span className='inline-flex items-center gap-1 text-[#0F766E] font-medium'>
									<Cpu className='h-3 w-3' />
									<span>Muse Spark 1.3</span>
								</span>
								<span>·</span>
								<span className='truncate max-w-[200px]'>
									{docTitle || 'Cross-corpus intelligence'}
								</span>
							</div>
						</div>
					</div>

					<div className='flex items-center gap-1'>
						<button
							onClick={() => {
								setMessages([]);
								setCitations([]);
								setSessionId(null);
							}}
							title='Clear conversation'
							className='p-1.5 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-white transition-colors'
							aria-label='Clear conversation'>
							<RefreshCw className='h-4 w-4' />
						</button>
						<button
							onClick={onClose}
							className='p-1.5 text-[#6B7280] hover:text-[#111827] rounded-lg hover:bg-white transition-colors'
							aria-label='Close drawer'>
							<X className='h-5 w-5' />
						</button>
					</div>
				</div>

				{/* Messages Area */}
				<div className='flex-1 overflow-y-auto p-5 space-y-4 bg-white'>
					{messages.length === 0 && (
						<div className='py-8 text-center px-4 space-y-6'>
							<div className='w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#3B49DF] flex items-center justify-center mx-auto shadow-xs'>
								<Sparkles className='h-6 w-6' />
							</div>
							<div className='space-y-1.5'>
								<h3 className='text-sm font-semibold text-[#111827]'>
									Grounded Cross-Document Analysis
								</h3>
								<p className='text-xs text-[#6B7280] max-w-xs mx-auto leading-relaxed'>
									Every response is cross-referenced with exact section titles, page numbers, and verified compliance guidelines.
								</p>
							</div>

							{/* Suggested Questions */}
							<div className='space-y-2 text-left pt-2'>
								<p className='text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider px-1'>
									Suggested Questions
								</p>
								{(docTitle
									? [
											'What key obligations and deadlines apply?',
											'Who are the designated owners and departments?',
											'Summarize the approval threshold matrix in this document.'
									  ]
									: [
											'Which contracts contain automatic renewal deadlines this quarter?',
											'What capital expenditure thresholds require Board sanction?',
											'Which circulars introduce compliance filings this month?'
									  ]
								).map((q, idx) => (
									<button
										key={idx}
										onClick={() => handleSend(q)}
										className='w-full text-left p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] hover:bg-[#F3F4F6] hover:border-[#D1D5DB] text-xs text-[#111827] font-medium transition-all'>
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
								className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
									m.role === 'user'
										? 'bg-[#111827] text-white'
										: 'bg-[#F8F9FA] text-[#111827] border border-[#E5E7EB]'
								}`}>
								{m.role === 'assistant' ? (
									<div className='doc-content text-xs'>
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{m.content}
										</ReactMarkdown>
									</div>
								) : (
									<p className='whitespace-pre-wrap'>{m.content}</p>
								)}

								{/* Sources Citations */}
								{m.citations && m.citations.length > 0 && (
									<div className='mt-3 pt-2.5 border-t border-[#E5E7EB] space-y-1.5'>
										<div className='text-[10px] font-semibold tracking-wider text-[#6B7280] uppercase'>
											Source Citations
										</div>
										<div className='flex flex-wrap gap-1.5'>
											{m.citations.map((c, cIdx) => (
												<Link
													key={cIdx}
													href={`/documents/${c.docId}`}
													className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E5E7EB] text-[11px] text-[#3B49DF] font-medium hover:border-[#3B49DF] transition-colors shadow-2xs'>
													<BookOpen className='h-3 w-3 text-[#0F766E]' />
													<span className='truncate max-w-[160px]'>{c.title || `Section ${c.index}`}</span>
													{c.pageRange?.start && (
														<span className='text-[#9CA3AF]'>
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
						<div className='flex items-center gap-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E7EB] text-xs text-[#4B5563] w-fit animate-pulse'>
							<Loader2 className='h-3.5 w-3.5 animate-spin text-[#3B49DF]' />
							<span>Reasoning with Muse Spark 1.3…</span>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Bar */}
				<div className='p-4 border-t border-[#E5E7EB] bg-white'>
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
							placeholder='Ask a follow-up question or search citations…'
							disabled={loading}
							className='w-full pl-4 pr-12 py-2.5 text-xs bg-[#F8F9FA] border border-[#E5E7EB] rounded-full text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#3B49DF] focus:bg-white transition-all shadow-inner'
						/>
						<button
							type='submit'
							disabled={loading || !input.trim()}
							className='absolute right-1.5 p-2 rounded-full bg-[#111827] text-white hover:bg-[#1F2937] disabled:opacity-40 disabled:hover:bg-[#111827] transition-all'
							aria-label='Send message'>
							{loading ? (
								<Loader2 className='h-3.5 w-3.5 animate-spin' />
							) : (
								<Send className='h-3.5 w-3.5' />
							)}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

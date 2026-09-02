'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
	Sparkles,
	Send,
	Loader2,
	BookOpen,
	RefreshCw,
	ArrowRight
} from 'lucide-react';
import { DocSetuSymbol } from '@/components/brand/DocSetuBrand';
import { askDocSetu, getChatHistory } from '@/services/intelligence';
import { ChatMessage, Citation } from '@/types/docsetu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function IntelligenceContent() {
	const searchParams = useSearchParams();
	const initialQuery = searchParams.get('q') || '';

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [, setCitations] = useState<Citation[]>([]);
	const [query, setQuery] = useState(initialQuery);
	const [loading, setLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const suggestedPrompts = [
		'Which vendor agreements require action this month?',
		'What are the latest procurement approval limits across teams?',
		'Summarize recent policy and circular changes in the workspace.',
		'What obligations and penalty clauses appear in our maintenance contracts?',
		'Which documents have pending sign-offs or compliance reviews?'
	];

	// Load session history on mount
	useEffect(() => {
		const loadInitial = async () => {
			try {
				const history = await getChatHistory();
				if (history.messages.length > 0) {
					setMessages(history.messages);
					setCitations(history.citations);
					setSessionId(history.sessionId);
				}
			} catch (err) {
				console.warn('Failed to load initial history', err);
			}
		};
		void loadInitial();
	}, []);

	const handleSend = useCallback(async (queryText?: string) => {
		const text = (queryText || query).trim();
		if (!text || loading) return;

		setQuery('');
		setLoading(true);

		const updatedMessages: ChatMessage[] = [
			...messages,
			{ role: 'user', content: text, timestamp: new Date() }
		];
		setMessages(updatedMessages);

		try {
			const res = await askDocSetu({
				query: text,
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
						'I encountered an error querying the intelligence corpus. Please try rephrasing your request.',
					timestamp: new Date()
				}
			]);
		} finally {
			setLoading(false);
		}
	}, [query, loading, messages, sessionId]);

	// Run initial query if provided in URL parameter
	useEffect(() => {
		if (initialQuery && initialQuery.trim() && messages.length === 0) {
			void handleSend(initialQuery.trim());
		}
	}, [initialQuery, handleSend, messages.length]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	const handleReset = () => {
		setMessages([]);
		setCitations([]);
		setSessionId(null);
		setQuery('');
	};

	return (
		<div className='p-6 md:p-8 max-w-5xl mx-auto space-y-6'>
			{/* Top Header */}
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
						<Sparkles className='h-6 w-6 text-[#4656D9]' />
						<span>Ask DocSetu</span>
					</h1>
					<p className='text-xs text-[#677080] mt-0.5'>
						Ask questions across policies, contracts, and circulars with page citations.
					</p>
				</div>

				{messages.length > 0 && (
					<button
						onClick={handleReset}
						className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E4DF] bg-white hover:bg-[#F6F7F4] text-xs font-medium text-[#677080] hover:text-[#172033] transition-colors'>
						<RefreshCw className='h-3.5 w-3.5' />
						<span>New conversation</span>
					</button>
				)}
			</div>

			{/* Primary Query Omniarea (If conversation hasn't started yet) */}
			{messages.length === 0 && (
				<div className='space-y-6'>
					<div className='bg-white rounded-2xl border border-[#E1E4DF] p-6 shadow-sm space-y-4'>
						<h2 className='text-sm font-semibold text-[#172033]'>
							What would you like to discover across your organization’s documents?
						</h2>

						<form
							onSubmit={e => {
								e.preventDefault();
								handleSend();
							}}
							className='space-y-3'>
							<textarea
								value={query}
								onChange={e => setQuery(e.target.value)}
								onKeyDown={e => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSend();
									}
								}}
								rows={3}
								placeholder='e.g. Which vendor contracts have upcoming renewal dates, and what approval thresholds apply?'
								className='w-full p-4 text-sm bg-[#F6F7F4] border border-[#E1E4DF] rounded-xl text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9] focus:bg-white resize-none transition-all'
							/>

							<div className='flex items-center justify-between pt-1'>
								<span className='text-[11px] text-[#9098A5]'>
									Press <kbd className='px-1 py-0.5 bg-[#F1F3F1] rounded text-[10px]'>Enter</kbd> to ask DocSetu
								</span>

								<button
									type='submit'
									disabled={loading || !query.trim()}
									className='px-4 py-2 bg-[#4656D9] text-white rounded-lg text-xs font-medium hover:bg-[#3B4BBF] disabled:opacity-40 flex items-center gap-2 shadow-2xs transition-colors'>
									{loading ? (
										<Loader2 className='h-4 w-4 animate-spin' />
									) : (
										<Sparkles className='h-4 w-4' />
									)}
									<span>Ask DocSetu</span>
								</button>
							</div>
						</form>
					</div>

					{/* Suggested Questions */}
					<div className='space-y-3'>
						<div className='text-xs font-semibold text-[#9098A5] uppercase tracking-wider'>
							Suggested Questions
						</div>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
							{suggestedPrompts.map((prompt, idx) => (
								<button
									key={idx}
									onClick={() => handleSend(prompt)}
									className='text-left p-4 rounded-xl border border-[#E1E4DF] bg-white hover:border-[#4656D9] hover:shadow-xs transition-all flex items-start justify-between gap-3 group'>
									<div className='space-y-1'>
										<p className='text-xs font-semibold text-[#172033] group-hover:text-[#4656D9] transition-colors'>
											&ldquo;{prompt}&rdquo;
										</p>
										<p className='text-[11px] text-[#9098A5]'>
											Checks policies, contracts, and circulars
										</p>
									</div>
									<ArrowRight className='h-4 w-4 text-[#9098A5] group-hover:text-[#4656D9] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5' />
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Active Conversation Feed */}
			{messages.length > 0 && (
				<div className='space-y-6'>
					<div className='bg-white rounded-2xl border border-[#E1E4DF] p-6 shadow-xs space-y-6'>
						{messages.map((m, idx) => (
							<div
								key={idx}
								className={`flex gap-3 ${
									m.role === 'user' ? 'justify-end' : 'justify-start'
								}`}>
								{m.role === 'assistant' && (
									<div className='w-8 h-8 rounded-lg bg-[#4656D9]/10 text-[#4656D9] flex items-center justify-center flex-shrink-0'>
										<DocSetuSymbol size='sm' />
									</div>
								)}

								<div
									className={`max-w-[85%] rounded-2xl p-5 text-sm ${
										m.role === 'user'
											? 'bg-[#4656D9] text-white shadow-xs'
											: 'bg-[#F6F7F4] border border-[#E1E4DF] text-[#172033]'
									}`}>
									{m.role === 'assistant' ? (
										<div className='prose prose-sm max-w-none text-[#172033] leading-relaxed'>
											<ReactMarkdown remarkPlugins={[remarkGfm]}>
												{m.content}
											</ReactMarkdown>
										</div>
									) : (
										<p className='whitespace-pre-wrap leading-relaxed'>{m.content}</p>
									)}

									{/* Embedded Citations */}
									{m.citations && m.citations.length > 0 && (
										<div className='mt-4 pt-3 border-t border-[#E1E4DF] space-y-2'>
											<div className='text-[11px] font-semibold text-[#677080] uppercase tracking-wider'>
												Citations
											</div>
											<div className='flex flex-wrap gap-2'>
												{m.citations.map((cit, cIdx) => (
													<Link
														key={cIdx}
														href={`/documents/${cit.docId}`}
														className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E1E4DF] text-xs font-medium text-[#4656D9] hover:border-[#4656D9] hover:bg-[#F6F7F4] transition-colors'>
														<BookOpen className='h-3.5 w-3.5 text-[#179C8C]' />
														<span>{cit.title || `Section ${cit.index}`}</span>
														{cit.pageRange?.start && (
															<span className='text-[#9098A5]'>
																(pp. {cit.pageRange.start}
																{cit.pageRange.end && cit.pageRange.end !== cit.pageRange.start
																	? `–${cit.pageRange.end}`
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
							<div className='flex items-center gap-3 p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] text-xs text-[#677080] w-fit'>
								<Loader2 className='h-4 w-4 animate-spin text-[#4656D9]' />
								<span>Searching document sections…</span>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* Sticky Follow-up Input */}
					<form
						onSubmit={e => {
							e.preventDefault();
							handleSend();
						}}
						className='relative flex items-center bg-white rounded-xl border border-[#E1E4DF] shadow-sm p-1.5'>
						<input
							type='text'
							value={query}
							onChange={e => setQuery(e.target.value)}
							placeholder='Ask a follow-up question across workspace documents…'
							disabled={loading}
							className='w-full px-4 py-2.5 text-sm bg-transparent text-[#172033] placeholder-[#9098A5] outline-none'
						/>
						<button
							type='submit'
							disabled={loading || !query.trim()}
							className='p-2 rounded-lg bg-[#4656D9] text-white hover:bg-[#3B4BBF] disabled:opacity-40 transition-colors'>
							<Send className='h-4 w-4' />
						</button>
					</form>
				</div>
			)}
		</div>
	);
}

export default function IntelligencePage() {
	return (
		<Suspense fallback={<div className='p-8 text-xs text-[#9098A5]'>Loading intelligence hub…</div>}>
			<IntelligenceContent />
		</Suspense>
	);
}

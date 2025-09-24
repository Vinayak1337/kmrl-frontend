'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, History, FileSearch } from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import {
	Card,
	CardHeader,
	CardContent,
	CardFooter,
	CardTitle,
	CardDescription
} from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { ScrollArea } from '@/components/UI/scroll-area';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

type Message = { role: 'user' | 'assistant'; content: string };
type Citation = {
	index: number;
	docId: string;
	nodeId: string;
	title?: string;
	score?: number;
	pageRange?: { start?: number; end?: number };
	uid?: string;
};

interface ChatBoxProps {
	docId?: string;
}

const AssistantMessage: React.FC<{ content: string }> = ({ content }) => (
	<ReactMarkdown
		remarkPlugins={[remarkGfm]}
		className='prose prose-xs max-w-none'>
		{content}
	</ReactMarkdown>
);
AssistantMessage.displayName = 'AssistantMessage';

export function ChatBox({ docId }: ChatBoxProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [citations, setCitations] = useState<Citation[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const init = async () => {
			try {
				const params = new URLSearchParams();
				if (sessionId) params.set('sessionId', sessionId);
				if (docId) params.set('docId', docId);
				const res = await fetch(`/api/chat?${params.toString()}`, {
					credentials: 'include'
				});
				if (!res.ok) return;
				const data = await res.json();
				setSessionId(data.sessionId || sessionId);
				if (Array.isArray(data.messages)) {
					const normalized = data.messages.filter(
						(m: Partial<Message>): m is Message =>
							m !== null &&
							typeof m === 'object' &&
							typeof m.content === 'string' &&
							m.role !== undefined &&
							(m.role === 'user' || m.role === 'assistant')
					);
					setMessages(normalized);
				} else {
					setMessages([]);
				}
				if (Array.isArray(data.citations)) {
					setCitations(data.citations as Citation[]);
				}
			} catch (err) {
				console.warn('Failed to load chat history', err);
			}
		};
		if (docId || sessionId) {
			void init();
		}
	}, [docId, sessionId]);

	useEffect(() => {
		if (containerRef.current)
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
	}, [messages, loading]);

	const send = async () => {
		const question = input.trim();
		if (!question || loading) return;
		const nextMessages: Message[] = [
			...messages,
			{ role: 'user', content: question }
		];
		setMessages(nextMessages);
		setInput('');
		setLoading(true);
		try {
			const payload = {
				docId,
				sessionId,
				messages: nextMessages
			};
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Chat failed');
			if (data.sessionId) setSessionId(data.sessionId);
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: data.reply || '' }
			]);
			setCitations(data.citations || []);
		} catch (error) {
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: 'Sorry, I could not answer that.' }
			]);
			console.error('Chat send failed', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className='flex h-[500px] flex-col border'>
			<CardHeader className='space-y-1'>
				<CardTitle className='text-base flex items-center gap-2'>
					<FileSearch className='h-4 w-4' />
					Ask the Corpus
				</CardTitle>
				<CardDescription>
					Ask focused questions{docId ? ' about this document' : ''}. Answers
					cite the retrieved sections.
				</CardDescription>
			</CardHeader>
			<CardContent className='flex-1 overflow-hidden'>
				<ScrollArea ref={containerRef} className='h-full pr-2'>
					<div className='space-y-3'>
						{messages.length === 0 && (
							<div className='rounded-md border border-dashed p-6 text-sm text-muted-foreground flex flex-col items-center gap-2'>
								<History className='h-5 w-5' />
								<span>
									Start a conversation to see referenced sections here.
								</span>
							</div>
						)}
						{messages.map((message, index) => (
							<div
								key={`${index}-${message.role}`}
								className={`flex ${
									message.role === 'user' ? 'justify-end' : 'justify-start'
								}`}>
								<div
									className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
										message.role === 'user'
											? 'bg-primary text-primary-foreground'
											: 'bg-muted text-muted-foreground'
									}`}>
									<div className='prose prose-xs max-w-none whitespace-pre-wrap'>
										{message.role === 'assistant' ? (
											<AssistantMessage content={message.content} />
										) : (
											message.content
										)}
									</div>
								</div>
							</div>
						))}
						{loading && (
							<div className='flex items-center gap-2 text-xs text-muted-foreground'>
								<Loader2 className='h-3 w-3 animate-spin' /> Thinking…
							</div>
						)}
					</div>
				</ScrollArea>
			</CardContent>
			{citations.length > 0 && (
				<div className='border-t bg-muted/50 px-4 py-3'>
					<div className='flex flex-wrap gap-2 text-xs'>
						{citations.map(citation => {
							const href = citation.uid
								? `/dashboard/${citation.docId}?uid=${encodeURIComponent(
										citation.uid
								  )}`
								: `/dashboard/${citation.docId}`;
							return (
								<a
									key={`${citation.index}-${citation.nodeId}`}
									href={href}
									target='_blank'
									rel='noreferrer'
									className='no-underline'>
									<Badge
										variant='secondary'
										className='flex items-center gap-1'>
										<span>[#{citation.index}]</span>
										<span>{citation.title || citation.nodeId}</span>
										{citation.pageRange?.start && (
											<span>
												Pg {citation.pageRange.start}
												{citation.pageRange?.end &&
												citation.pageRange.end !== citation.pageRange.start
													? `-${citation.pageRange.end}`
													: ''}
											</span>
										)}
									</Badge>
								</a>
							);
						})}
					</div>
				</div>
			)}
			<CardFooter className='border-t px-4 py-3'>
				<div className='flex w-full items-center gap-2'>
					<Input
						placeholder='Type your question…'
						value={input}
						onChange={event => setInput(event.target.value)}
						onKeyDown={event => {
							if (event.key === 'Enter') send();
						}}
					/>
					<Button
						onClick={send}
						disabled={loading || !input.trim()}
						size='icon'>
						{loading ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Send className='h-4 w-4' />
						)}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

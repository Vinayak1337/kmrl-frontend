'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
	Send,
	Loader2,
	History,
	FileSearch,
	Mic,
	MicOff,
	Volume2,
	VolumeX,
	Pause,
	Play
} from 'lucide-react';
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
import { useSimpleSpeechRecognition } from '@/hooks/useSimpleSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

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
	variant?: 'standalone' | 'embedded';
}

const AssistantMessage: React.FC<{ content: string }> = ({ content }) => (
	<ReactMarkdown
		remarkPlugins={[remarkGfm]}
		className='prose prose-xs max-w-none'>
		{content}
	</ReactMarkdown>
);
AssistantMessage.displayName = 'AssistantMessage';

export function ChatBox({ docId, variant = 'standalone' }: ChatBoxProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [citations, setCitations] = useState<Citation[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isListeningToMessage, setIsListeningToMessage] = useState<
		number | null
	>(null);

	const {
		isListening,
		interimTranscript,
		isSupported: speechRecognitionSupported,
		startListening,
		stopListening,
		resetTranscript
	} = useSimpleSpeechRecognition({
		continuous: false,
		interimResults: true,
		language: 'en-US',
		onResult: (speechText: string, isFinal: boolean) => {
			if (isFinal && speechText.trim()) {
				setInput(prev =>
					prev ? `${prev} ${speechText}`.trim() : speechText.trim()
				);
			}
		},
		onError: error => alert(error)
	});

	const {
		isSpeaking,
		isPaused,
		isSupported: speechSynthesisSupported,
		speak,
		pause,
		resume,
		cancel
	} = useSpeechSynthesis({
		rate: 0.9,
		onEnd: () => setIsListeningToMessage(null)
	});

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
		cancel();
		setIsListeningToMessage(null);

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

			const assistantContent = data.reply || '';
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: assistantContent }
			]);
			setCitations(data.citations || []);

			if (speechSynthesisSupported && assistantContent.trim()) {
				cancel();
				const answerIndex = nextMessages.length;
				setIsListeningToMessage(answerIndex);
				speak(assistantContent);
			}
		} catch (err) {
			const fallbackContent = 'Sorry, I could not answer that.';
			if (process.env.NODE_ENV !== 'production') {
				console.error('Chat send failed', err);
			}
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: fallbackContent }
			]);

			if (speechSynthesisSupported) {
				cancel();
				const fallbackIndex = nextMessages.length;
				setIsListeningToMessage(fallbackIndex);
				speak(fallbackContent);
			}
		} finally {
			setLoading(false);
		}
	};

	const toggleListening = async () => {
		if (isListening) {
			stopListening();
			return;
		}
		try {
			if (navigator.mediaDevices?.getUserMedia) {
				await navigator.mediaDevices.getUserMedia({ audio: true });
			}
			resetTranscript();
			startListening();
		} catch (error) {
			alert('Microphone access required. Please allow microphone permissions.');
		}
	};

	const handleSpeakMessage = (messageIndex: number, content: string) => {
		if (isListeningToMessage === messageIndex && (isSpeaking || isPaused)) {
			if (isPaused) resume();
			else pause();
		} else {
			cancel();
			setIsListeningToMessage(messageIndex);
			speak(content);
		}
	};

	const stopSpeaking = () => {
		cancel();
		setIsListeningToMessage(null);
	};

	// Minimal embedded rendering without outer Card
	if (variant === 'embedded') {
		return (
			<div className='flex h-[480px] flex-col rounded-xl bg-transparent'>
				<div className='flex-1 overflow-hidden'>
					<ScrollArea ref={containerRef} className='h-full pr-2'>
						<div className='flex h-full flex-col gap-3 p-4'>
							{messages.length === 0 && (
								<div className='flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground'>
									<History className='h-5 w-5' />
									<span>
										Start a conversation to see referenced sections here.
									</span>
								</div>
							)}
							{messages.map((message, index) => {
								const isUser = message.role === 'user';
								const isActiveMessage =
									!isUser &&
									isListeningToMessage === index &&
									speechSynthesisSupported &&
									(isSpeaking || isPaused);
								const bubbleClasses = isUser
									? 'bg-primary text-primary-foreground'
									: 'bg-muted text-muted-foreground';
								return (
									<div
										key={`${index}-${message.role}`}
										className={`flex ${
											isUser ? 'justify-end' : 'justify-start'
										}`}>
										<div
											className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${bubbleClasses}`}>
											<div className='prose prose-xs max-w-none whitespace-pre-wrap'>
												{message.role === 'assistant' ? (
													<AssistantMessage content={message.content} />
												) : (
													message.content
												)}
											</div>
											{!isUser && speechSynthesisSupported && (
												<div className='mt-1 flex justify-end gap-1'>
													<Button
														variant='ghost'
														size='sm'
														className='h-7 px-2 text-xs'
														onClick={() =>
															handleSpeakMessage(index, message.content)
														}
														title={
															isActiveMessage
																? isPaused
																	? 'Resume narration'
																	: 'Pause narration'
																: 'Listen to this response'
														}>
														{isActiveMessage ? (
															isPaused ? (
																<Play className='h-3 w-3' />
															) : (
																<Pause className='h-3 w-3' />
															)
														) : (
															<Volume2 className='h-3 w-3' />
														)}
													</Button>
													{isActiveMessage && (
														<Button
															variant='ghost'
															size='sm'
															className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
															onClick={stopSpeaking}
															title='Stop narration'>
															<VolumeX className='h-3 w-3' />
														</Button>
													)}
												</div>
											)}
										</div>
									</div>
								);
							})}
							{loading && (
								<div className='flex items-center gap-2 rounded-md bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
									<Loader2 className='h-3 w-3 animate-spin text-primary' />
									<span>Thinking…</span>
								</div>
							)}
						</div>
					</ScrollArea>
				</div>
				{citations.length > 0 && (
					<div className='px-4 py-3'>
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
										</Badge>
									</a>
								);
							})}
						</div>
					</div>
				)}
				<div className='px-4 py-3'>
					<div className='flex w-full items-center gap-2'>
						<div className='flex-1 relative'>
							<Input
								placeholder={
									isListening
										? '🎤 Listening… speak now!'
										: 'Type your question…'
								}
								value={input}
								onChange={event => !isListening && setInput(event.target.value)}
								onKeyDown={event => {
									if (event.key === 'Enter') send();
								}}
							/>
							{isListening && interimTranscript && (
								<div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 italic'>
									{interimTranscript}
								</div>
							)}
						</div>
						{speechRecognitionSupported && (
							<Button
								variant={isListening ? 'default' : 'outline'}
								onClick={toggleListening}
								disabled={loading}
								title={isListening ? 'Stop listening' : 'Start voice input'}>
								{isListening ? (
									<MicOff className='h-4 w-4' />
								) : (
									<Mic className='h-4 w-4' />
								)}
							</Button>
						)}
						<Button
							onClick={send}
							disabled={loading || !input.trim()}
							size='icon'
							aria-label='Send message'>
							{loading ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<Send className='h-4 w-4' />
							)}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// Embedded variant planned but not enabled yet

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
					<div className='flex h-full flex-col gap-3 rounded-xl bg-muted/30 p-4'>
						{messages.length === 0 && (
							<div className='flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground'>
								<History className='h-5 w-5' />
								<span>
									Start a conversation to see referenced sections here.
								</span>
							</div>
						)}
						{messages.map((message, index) => {
							const isUser = message.role === 'user';
							const isActiveMessage =
								!isUser &&
								isListeningToMessage === index &&
								speechSynthesisSupported &&
								(isSpeaking || isPaused);
							const bubbleClasses = isUser
								? 'bg-primary text-primary-foreground border-primary/30 shadow-primary/40'
								: 'bg-white text-foreground border-border shadow-sm';
							const headerTextColor = isUser
								? 'text-primary-foreground/80'
								: 'text-muted-foreground';
							const bodyTextColor = isUser
								? 'text-primary-foreground'
								: 'text-muted-foreground';
							return (
								<div
									key={`${index}-${message.role}`}
									className={`flex ${
										isUser ? 'justify-end' : 'justify-start'
									}`}>
									<div
										className={`group relative max-w-[85%] space-y-2 rounded-2xl border p-4 transition-all duration-200 ${bubbleClasses}`}>
										<div
											className={`flex items-center justify-between text-[11px] uppercase tracking-wide ${headerTextColor}`}>
											<Badge
												variant={isUser ? 'outline' : 'secondary'}
												className={`font-medium ${
													isUser
														? 'border-primary-foreground text-primary-foreground bg-primary/10'
														: ''
												}`}>
												{isUser ? 'You' : 'Assistant'}
											</Badge>
											{!isUser && speechSynthesisSupported && (
												<div className='flex items-center gap-1 transition-opacity group-hover:opacity-100'>
													<Button
														variant='ghost'
														size='sm'
														className='h-7 px-2 text-xs'
														onClick={() =>
															handleSpeakMessage(index, message.content)
														}
														title={
															isActiveMessage
																? isPaused
																	? 'Resume narration'
																	: 'Pause narration'
																: 'Listen to this response'
														}>
														{isActiveMessage ? (
															isPaused ? (
																<Play className='h-3 w-3' />
															) : (
																<Pause className='h-3 w-3' />
															)
														) : (
															<Volume2 className='h-3 w-3' />
														)}
													</Button>
													{isActiveMessage && (
														<Button
															variant='ghost'
															size='sm'
															className='h-7 px-2 text-xs text-red-500 hover:text-red-600'
															onClick={stopSpeaking}
															title='Stop narration'>
															<VolumeX className='h-3 w-3' />
														</Button>
													)}
												</div>
											)}
										</div>
										<div
											className={`prose prose-xs max-w-none ${bodyTextColor}`}>
											{message.role === 'assistant' ? (
												<AssistantMessage content={message.content} />
											) : (
												<span className='whitespace-pre-wrap'>
													{message.content}
												</span>
											)}
										</div>
										{isActiveMessage && (
											<div className='flex items-center gap-2 text-[11px] font-medium text-blue-600'>
												<div className='h-2 w-2 rounded-full bg-blue-500 animate-pulse' />
												<span>{isPaused ? 'Paused' : 'Playing aloud'}</span>
											</div>
										)}
									</div>
								</div>
							);
						})}
						{loading && (
							<div className='flex items-center gap-2 rounded-md bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
								<Loader2 className='h-3 w-3 animate-spin text-primary' />
								<span>Thinking…</span>
							</div>
						)}
					</div>
				</ScrollArea>
			</CardContent>
			{citations.length > 0 && (
				<div className='px-4 py-3'>
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
			<CardFooter className='px-4 py-3'>
				<div className='flex w-full items-center gap-2'>
					<div className='flex-1 relative'>
						<Input
							placeholder={
								isListening ? '🎤 Listening… speak now!' : 'Type your question…'
							}
							value={input}
							onChange={event => !isListening && setInput(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') send();
							}}
						/>
						{isListening && interimTranscript && (
							<div className='absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500 italic'>
								{interimTranscript}
							</div>
						)}
					</div>
					{speechRecognitionSupported && (
						<Button
							variant={isListening ? 'default' : 'outline'}
							onClick={toggleListening}
							disabled={loading}
							title={isListening ? 'Stop listening' : 'Start voice input'}>
							{isListening ? (
								<MicOff className='h-4 w-4' />
							) : (
								<Mic className='h-4 w-4' />
							)}
						</Button>
					)}
					{speechSynthesisSupported && (isSpeaking || isPaused) && (
						<Button
							variant='outline'
							onClick={stopSpeaking}
							title='Stop text-to-speech'
							className='hidden md:inline-flex text-red-500 hover:text-red-600'>
							<VolumeX className='h-4 w-4' />
						</Button>
					)}
					<Button
						onClick={send}
						disabled={loading || !input.trim()}
						size='icon'
						aria-label='Send message'>
						{loading ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Send className='h-4 w-4' />
						)}
					</Button>
				</div>
			</CardFooter>
			{speechSynthesisSupported && (isSpeaking || isPaused) && (
				<Button
					variant='outline'
					onClick={stopSpeaking}
					title='Stop text-to-speech'
					className='md:hidden w-full text-red-500 hover:text-red-600'>
					<VolumeX className='h-4 w-4' />
					<span className='ml-2 text-xs'>Stop narration</span>
				</Button>
			)}
		</Card>
	);
}

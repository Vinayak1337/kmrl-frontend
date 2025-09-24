'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/UI/button';
import {
	ArrowLeft,
	FileText,
	Tag,
	Clock,
	ChevronRight,
	ChevronLeft,
	AlertCircle,
	CheckCircle,
	XCircle
} from 'lucide-react';
import { ChatBox } from '@/components/dashboard/ChatBox';
import { FeedbackForm } from '@/components/dashboard/FeedbackForm';
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue
} from '@/components/UI/select';
import { Card, CardContent } from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import dynamic from 'next/dynamic';

const MarkdownRenderer = dynamic(
	() =>
		import('@/components/markdown/MarkdownRenderer').then(
			mod => mod.MarkdownRenderer
		),
	{
		ssr: false,
		loading: () => <span className='text-gray-500'>…</span>
	}
);

export default function DocumentDetailPage() {
	const params = useParams();
	const search = useSearchParams();
	const documentId = params?.id as string;

	const [document, setDocument] = useState<ProcessedDocument | null>(null);
	const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [nodes, setNodes] = useState<DocumentNode[]>([]);
	const [totalNodes, setTotalNodes] = useState<number>(0);
	const [page, setPage] = useState<number>(0);
	const [pageSize] = useState<number>(10);
	const [loadingNodes, setLoadingNodes] = useState<boolean>(false);
	const [translationLanguage, setTranslationLanguage] = useState<string>('');
	const [translationLoading, setTranslationLoading] = useState<boolean>(false);
	const [translatedSummaries, setTranslatedSummaries] = useState<
		Map<
			string,
			{
				summary: string;
				keyPoints: string[];
				actionableItems: string[];
				language: string;
			}
		>
	>(new Map());

	const renderMarkdown = useCallback((md?: string) => {
		if (!md) return null;
		const trimmed = md.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith('```')) {
			return (
				<pre className='overflow-auto bg-gray-50 border rounded p-3 text-sm text-gray-800'>
					<code>{trimmed}</code>
				</pre>
			);
		}
		return <MarkdownRenderer>{trimmed}</MarkdownRenderer>;
	}, []);

	interface DocumentNode {
		id: string;
		pageRange: { start: number; end: number };
		content: string;
		images: Array<{
			page: number;
			base64: string;
			mimeType: string;
			caption?: string;
		}>;
		topicSummary?: string;
		summary: string;
		// Markdown variants (preferred rendering)
		summaryMd?: string;
		keyPointsMd?: string;
		actionsMd?: string;
		keyPoints: string[];
		actionableItems: string[];
		criticalFlags?: string[];
		crossDepartments?: string[];
		needsImage?: boolean;
		nextNodeId?: string;
		prevNodeId?: string;
	}

	interface ProcessedDocument {
		id: string;
		title: string;
		originalFormat: string;
		totalPages: number;
		language: string;
		nodes: DocumentNode[];
		nodeCount?: number;
		fullSummary: string;
		overallMd?: string;
		metadata: {
			createdAt: Date;
			uploadedBy: string;
			department?: string;
			documentType?: string;
			tags?: string[];
		};
	}

	const loadDocument = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(`/api/documents/ingest?id=${documentId}`, {
				credentials: 'include'
			});

			if (!response.ok) {
				throw new Error('Document not found');
			}

			const data = await response.json();
			setDocument(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load document');
		} finally {
			setLoading(false);
		}
	}, [documentId]);

	useEffect(() => {
		if (documentId) {
			void loadDocument();
		}
	}, [documentId, loadDocument]);

	const loadNodesPage = useCallback(
		async (p: number, size: number, replace = false) => {
			setLoadingNodes(true);
			try {
				const res = await fetch(
					`/api/documents/${documentId}/nodes?page=${p}&limit=${size}`,
					{ credentials: 'include' }
				);
				if (!res.ok) return;
				const data = await res.json();
				const list = Array.isArray(data.nodes) ? data.nodes : [];
				setTotalNodes(Number(data.total || list.length));
				setNodes(prev => (replace ? list : [...prev, ...list]));
			} finally {
				setLoadingNodes(false);
			}
		},
		[documentId]
	);

	useEffect(() => {
		if (!documentId) return;
		const uid = search?.get('uid');
		const init = async () => {
			if (uid) {
				try {
					const r = await fetch(`/api/nodes/${encodeURIComponent(uid)}`, {
						credentials: 'include'
					});
					if (r.ok) {
						const data = await r.json();
						const order = Number(data?.node?.order || 1);
						const size = pageSize;
						const targetPage = Math.max(0, Math.floor((order - 1) / size));
						setPage(targetPage);
						await loadNodesPage(targetPage, size, true);
						const localIndex = order - 1 - targetPage * size;
						setCurrentNodeIndex(Math.max(0, Math.min(localIndex, size - 1)));
						return;
					}
				} catch {}
			}
			await loadNodesPage(0, pageSize, true);
			setPage(0);
			setCurrentNodeIndex(0);
		};
		void init();
	}, [documentId, pageSize, loadNodesPage, search]);

	const currentNode = nodes[currentNodeIndex];

	const getTranslationKey = (nodeId: string, language: string) =>
		`${nodeId}:${language}`;

	const translateCurrentNode = useCallback(async () => {
		if (!currentNode || !document || !translationLanguage) return;
		const cacheKey = getTranslationKey(currentNode.id, translationLanguage);
		if (translatedSummaries.has(cacheKey)) return;
		setTranslationLoading(true);
		try {
			const payload = {
				language: translationLanguage,
				summary: currentNode.summary,
				keyPoints: currentNode.keyPoints || [],
				actionableItems: currentNode.actionableItems || []
			};
			const res = await fetch('/api/translate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				console.error('Translation failed');
				return;
			}
			const data = await res.json();
			setTranslatedSummaries(prev => {
				const next = new Map(prev);
				next.set(cacheKey, {
					summary: data.summary || '',
					keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
					actionableItems: Array.isArray(data.actionableItems)
						? data.actionableItems
						: [],
					language: translationLanguage
				});
				return next;
			});
		} catch (err) {
			console.error('Failed to translate node', err);
		} finally {
			setTranslationLoading(false);
		}
	}, [currentNode, translationLanguage, translatedSummaries, document]);

	useEffect(() => {
		setTranslationLoading(false);
	}, [currentNodeIndex, page, translationLanguage]);

	const copySummary = async () => {
		if (!document || !currentNode) return;
		const absoluteIndex = page * pageSize + currentNodeIndex + 1;
		const header = `${document.title} — Section ${absoluteIndex} (Pages ${currentNode.pageRange.start}-${currentNode.pageRange.end})`;
		const points = (currentNode.keyPoints || [])
			.slice(0, 8)
			.map(p => `- ${p}`)
			.join('\n');
		const actions = (currentNode.actionableItems || [])
			.slice(0, 6)
			.map(a => `• ${a}`)
			.join('\n');
		const text = [
			header,
			'',
			currentNode.topicSummary ? `Topic: ${currentNode.topicSummary}` : '',
			'Summary:',
			currentNode.summary,
			points ? '\nKey Points:\n' + points : '',
			actions ? '\nActionable Items:\n' + actions : ''
		]
			.filter(Boolean)
			.join('\n');
		try {
			await navigator.clipboard.writeText(text);
		} catch {}
	};

	const extractDueDates = (items: string[]): string[] => {
		const dates: string[] = [];
		const rx =
			/\b(?:\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},?\s*\d{2,4}|\b\d{4}-\d{2}-\d{2}|\b\d{1,2}\/\d{1,2}\/\d{2,4}|\bby\s+(?:EOD|\w+day)\b/gi;
		for (const it of items) {
			const m = it.match(rx);
			if (m) dates.push(...m);
		}
		return Array.from(new Set(dates));
	};

	const navigateNode = (direction: 'prev' | 'next') => {
		if (direction === 'prev' && currentNodeIndex > 0) {
			setCurrentNodeIndex(currentNodeIndex - 1);
		} else if (direction === 'next') {
			const absNext = page * pageSize + currentNodeIndex + 1;
			const total =
				totalNodes || document?.nodeCount || document?.nodes?.length || 0;
			if (absNext < total && currentNodeIndex < nodes.length - 1) {
				setCurrentNodeIndex(currentNodeIndex + 1);
			}
		}
	};

	if (loading) {
		return (
			<div className='min-h-screen bg-gray-100 p-8'>
				<div className='max-w-6xl mx-auto'>
					<div className='animate-pulse'>
						<div className='h-8 bg-gray-200 rounded w-1/4 mb-4' />
						<div className='h-4 bg-gray-200 rounded w-1/2 mb-8' />
						<div className='bg-white rounded-lg shadow p-8'>
							<div className='h-6 bg-gray-200 rounded w-3/4 mb-4' />
							<div className='h-4 bg-gray-200 rounded w-full mb-2' />
							<div className='h-4 bg-gray-200 rounded w-full mb-2' />
							<div className='h-4 bg-gray-200 rounded w-2/3' />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error || !document) {
		return (
			<div className='min-h-screen bg-gray-100 p-8'>
				<div className='max-w-6xl mx-auto'>
					<div className='bg-red-50 rounded-lg p-8 text-center'>
						<XCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
						<h2 className='text-xl font-semibold text-red-800 mb-2'>
							{error || 'Document not found'}
						</h2>
						<Link
							href='/dashboard'
							className='text-blue-600 hover:text-blue-800'>
							Return to Dashboard
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-gray-50 via-blue-50 to-white'>
			{/* Header */}
			<div className='bg-white shadow-sm border-b'>
				<div className='max-w-6xl mx-auto px-4 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<Button
								variant='ghost'
								className='flex items-center gap-2'
								onClick={() => window.history.back()}>
								<ArrowLeft className='h-4 w-4' />
								Back
							</Button>
							<div>
								<h1 className='text-2xl font-bold text-gray-900'>
									{document.title}
								</h1>
								<div className='flex items-center gap-3 text-sm text-gray-500'>
									<span className='flex items-center gap-1'>
										<FileText className='h-3 w-3' />{' '}
										{document.originalFormat.toUpperCase()}
									</span>
									<span className='flex items-center gap-1'>
										<Clock className='h-3 w-3' />
										{document.metadata.createdAt
											? new Date(document.metadata.createdAt).toLocaleString()
											: 'Unknown'}
									</span>
									{document.metadata.department && (
										<span className='flex items-center gap-1'>
											<Tag className='h-3 w-3' /> {document.metadata.department}
										</span>
									)}
									{document.metadata.tags &&
										document.metadata.tags.length > 0 && (
											<span className='flex items-center gap-1'>
												<Tag className='h-3 w-3' />
												{document.metadata.tags.join(', ')}
											</span>
										)}
								</div>
							</div>
						</div>
						<div className='flex items-center gap-3'>
							<Link href='/dashboard' className='inline-flex items-center'>
								<Button variant='outline' size='sm'>
									Dashboard Overview
								</Button>
							</Link>
							<div className='flex items-center gap-2'>
								<Select
									value={translationLanguage}
									onValueChange={value => setTranslationLanguage(value)}>
									<SelectTrigger className='min-w-[150px] h-9'>
										<SelectValue placeholder='Translate' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value=''>Original</SelectItem>
										<SelectItem value='ml-IN'>Malayalam</SelectItem>
										<SelectItem value='hi-IN'>Hindi</SelectItem>
										<SelectItem value='ta-IN'>Tamil</SelectItem>
										<SelectItem value='en-IN'>English (IN)</SelectItem>
									</SelectContent>
								</Select>
								<Button
									size='sm'
									variant='outline'
									className='h-9 px-4'
									disabled={!translationLanguage || translationLoading}
									onClick={translateCurrentNode}>
									{translationLoading ? 'Translating…' : 'Translate'}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className='max-w-6xl mx-auto px-4 py-6'>
				<div className='grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6'>
					{/* Summary Card */}
					<div className='bg-white rounded-lg shadow-sm border'>
						<div className='p-6'>
							<h2 className='text-lg font-semibold text-gray-900 mb-3'>
								Document Summary
							</h2>
							{document.overallMd ? (
								renderMarkdown(document.overallMd)
							) : (
								<p className='text-gray-700 whitespace-pre-wrap'>
									{document.fullSummary}
								</p>
							)}

							{document.metadata.tags && document.metadata.tags.length > 0 && (
								<div className='mt-4 flex flex-wrap gap-2'>
									{document.metadata.tags.map((tag, i) => (
										<span
											key={i}
											className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm'>
											{tag}
										</span>
									))}
								</div>
							)}

							<div className='mt-4 pt-4 border-t'>
								<div className='grid grid-cols-3 gap-4 text-sm'>
									<div>
										<span className='text-gray-600'>Total Pages:</span>
										<span className='ml-2 font-medium'>
											{document.totalPages}
										</span>
									</div>
									<div>
										<span className='text-gray-600'>Sections:</span>
										<span className='ml-2 font-medium'>
											{totalNodes ||
												document.nodeCount ||
												document.nodes.length}
										</span>
									</div>
									<div>
										<span className='text-gray-600'>Format:</span>
										<span className='ml-2 font-medium'>
											{document.originalFormat.toUpperCase()}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Node Navigation */}
					<div className='bg-white rounded-lg shadow-sm'>
						<div className='border-b px-6 py-4'>
							<div className='flex items-center justify-between'>
								<h3 className='text-lg font-semibold'>
									Section {page * pageSize + currentNodeIndex + 1} of{' '}
									{totalNodes || document.nodeCount || document.nodes.length}
								</h3>
								<div className='flex items-center gap-2'>
									<Button
										variant='outline'
										size='sm'
										onClick={() => navigateNode('prev')}
										disabled={currentNodeIndex === 0}
										className='p-2 h-auto'>
										<ChevronLeft className='h-5 w-5' />
									</Button>
									<span className='text-sm text-gray-600'>
										Pages {currentNode?.pageRange.start} -{' '}
										{currentNode?.pageRange.end}
									</span>
									<Button
										variant='outline'
										size='sm'
										onClick={() => navigateNode('next')}
										disabled={
											page * pageSize + currentNodeIndex + 1 >=
											(totalNodes ||
												document.nodeCount ||
												document.nodes.length)
										}
										className='p-2 h-auto'>
										<ChevronRight className='h-5 w-5' />
									</Button>
									<Button
										variant='outline'
										size='sm'
										onClick={copySummary}
										className='ml-2'>
										Copy Summary
									</Button>
								</div>
							</div>
						</div>

						{currentNode && (
							<div className='p-6 space-y-6'>
								{currentNode.topicSummary && (
									<div className='mb-3 text-sm text-gray-600'>
										Topic:{' '}
										<span className='font-medium'>
											{currentNode.topicSummary}
										</span>
									</div>
								)}

								<div className='mb-6'>
									<h4 className='font-semibold text-gray-900 mb-2'>Summary</h4>
									{translationLanguage && currentNode
										? (() => {
												const cacheKey = getTranslationKey(
													currentNode.id,
													translationLanguage
												);
												const translated = translatedSummaries.get(cacheKey);
												if (translated) {
													return (
														<div className='space-y-3'>
															<Card className='border border-primary/40 bg-primary/5'>
																<CardContent className='pt-4'>
																	<div className='flex items-center gap-2 text-sm text-primary'>
																		<Badge variant='secondary'>
																			{translationLanguage}
																		</Badge>
																		<span>Translated summary</span>
																	</div>
																	<p className='text-gray-800 mt-2 whitespace-pre-wrap'>
																		{translated.summary
																			? renderMarkdown(translated.summary)
																			: null}
																	</p>
																	{translated.keyPoints.length > 0 && (
																		<div className='mt-3'>
																			<h5 className='text-sm font-semibold text-gray-900'>
																				Key Points
																			</h5>
																			{translated.keyPoints.length > 0
																				? renderMarkdown(
																						translated.keyPoints.join('\n')
																				  )
																				: null}
																		</div>
																	)}
																	{translated.actionableItems.length > 0 && (
																		<div className='mt-3'>
																			<h5 className='text-sm font-semibold text-gray-900'>
																				Actionable Items
																			</h5>
																			{translated.actionableItems.length > 0
																				? renderMarkdown(
																						translated.actionableItems.join(
																							'\n'
																						)
																				  )
																				: null}
																		</div>
																	)}
																</CardContent>
															</Card>
														</div>
													);
												}
												return null;
										  })()
										: null}
									{currentNode.summaryMd ? (
										currentNode.summaryMd.trim().startsWith('```') ? (
											<pre className='overflow-auto bg-gray-50 border rounded p-3 text-sm text-gray-800'>
												<code>{currentNode.summaryMd}</code>
											</pre>
										) : (
											renderMarkdown(currentNode.summaryMd) ?? (
												<p className='text-gray-700 whitespace-pre-wrap'>
													{currentNode.summary}
												</p>
											)
										)
									) : (
										<p className='text-gray-700'>{currentNode.summary}</p>
									)}
								</div>

								{/* Removed image/voice reader card as requested */}

								{/* Critical Flags and Cross-Departments */}
								{(currentNode.criticalFlags?.length ||
									currentNode.crossDepartments?.length) && (
									<div className='mb-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
										{currentNode.criticalFlags?.length ? (
											<div>
												<h4 className='font-semibold text-gray-900 mb-2'>
													Critical Flags
												</h4>
												<div className='flex flex-wrap gap-2'>
													{currentNode.criticalFlags.map((f, i) => (
														<span
															key={i}
															className='px-2 py-1 text-xs rounded bg-red-100 text-red-700'>
															{f}
														</span>
													))}
												</div>
											</div>
										) : null}
										{currentNode.crossDepartments?.length ? (
											<div>
												<h4 className='font-semibold text-gray-900 mb-2'>
													Cross-Departments
												</h4>
												<div className='flex flex-wrap gap-2'>
													{currentNode.crossDepartments.map((d, i) => (
														<span
															key={i}
															className='px-2 py-1 text-xs rounded bg-blue-100 text-blue-700'>
															{d}
														</span>
													))}
												</div>
											</div>
										) : null}
									</div>
								)}

								{/* Key Points */}
								{(currentNode.keyPointsMd ||
									currentNode.keyPoints.length > 0) && (
									<div className='mb-6'>
										<h4 className='font-semibold text-gray-900 mb-2 flex items-center gap-2'>
											<CheckCircle className='h-4 w-4 text-green-600' />
											Key Points
										</h4>
										{currentNode.keyPointsMd ? (
											renderMarkdown(currentNode.keyPointsMd)
										) : (
											<ul className='list-disc list-inside space-y-1 text-gray-700 text-sm'>
												{(currentNode.keyPoints || []).map((point, idx) => (
													<li key={idx}>{point}</li>
												))}
											</ul>
										)}
									</div>
								)}

								{/* Actionable Items */}
								{(currentNode.actionsMd ||
									currentNode.actionableItems.length > 0) && (
									<div className='mb-6'>
										<h4 className='font-semibold text-gray-900 mb-2 flex items-center gap-2'>
											<AlertCircle className='h-4 w-4 text-orange-600' />
											Actionable Items
										</h4>
										{currentNode.actionsMd ? (
											renderMarkdown(currentNode.actionsMd)
										) : (
											<ul className='list-disc list-inside space-y-1 text-gray-700 text-sm'>
												{(currentNode.actionableItems || []).map(
													(item, idx) => (
														<li key={idx}>{item}</li>
													)
												)}
											</ul>
										)}
										{/* Due Dates */}
										{!currentNode.actionsMd &&
											extractDueDates(currentNode.actionableItems).length >
												0 && (
												<div className='mt-3 text-sm'>
													<span className='font-semibold text-gray-900'>
														Due Dates:{' '}
													</span>
													{extractDueDates(currentNode.actionableItems).map(
														(d, i) => (
															<span
																key={i}
																className='inline-block mr-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded'>
																{d}
															</span>
														)
													)}
												</div>
											)}
									</div>
								)}

								{/* Original Content (Collapsible) */}
								<details className='mt-6 border-t pt-6'>
									<summary className='cursor-pointer font-semibold text-gray-900 hover:text-blue-600'>
										View Original Content
									</summary>
									<div className='mt-4 p-4 bg-gray-50 rounded-lg'>
										<pre className='whitespace-pre-wrap text-sm text-gray-700 font-mono'>
											{currentNode.content}
										</pre>
									</div>
								</details>
							</div>
						)}

						{/* Quick Navigation for current page */}
						<div className='border-t px-6 py-4'>
							<div className='flex gap-2 flex-wrap items-center justify-between'>
								<div className='flex gap-2 flex-wrap'>
									{nodes.map((_, index) => (
										<Button
											key={index}
											size='sm'
											variant={
												index === currentNodeIndex ? 'default' : 'outline'
											}
											onClick={() => setCurrentNodeIndex(index)}>
											Section {page * pageSize + index + 1}
										</Button>
									))}
								</div>
								<div className='flex gap-2'>
									<Button
										variant='outline'
										size='sm'
										disabled={loadingNodes || page === 0}
										onClick={async () => {
											const prev = Math.max(0, page - 1);
											setPage(prev);
											await loadNodesPage(prev, pageSize, true);
											setCurrentNodeIndex(0);
										}}>
										Previous Page
									</Button>
									<Button
										variant='outline'
										size='sm'
										disabled={
											loadingNodes ||
											(page + 1) * pageSize >=
												(totalNodes ||
													document.nodeCount ||
													document.nodes.length)
										}
										onClick={async () => {
											const next = page + 1;
											setPage(next);
											await loadNodesPage(next, pageSize, true);
											setCurrentNodeIndex(0);
										}}>
										Next Page
									</Button>
									<Button
										size='sm'
										disabled={
											loadingNodes ||
											(page + 1) * pageSize >=
												(totalNodes ||
													document.nodeCount ||
													document.nodes.length)
										}
										onClick={async () => {
											const next = page + 1;
											setPage(next);
											await loadNodesPage(next, pageSize);
										}}>
										Load More
									</Button>
								</div>
							</div>
						</div>
					</div>

					{/* Chat + Feedback */}
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
						<div>
							<h3 className='text-lg font-semibold text-gray-900 mb-2'>
								Ask About This Document
							</h3>
							<ChatBox docId={document.id} />
						</div>
						<div className='lg:mt-8'>
							<FeedbackForm docId={document.id} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

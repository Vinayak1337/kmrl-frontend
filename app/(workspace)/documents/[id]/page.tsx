'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft,
	Sparkles,
	Languages,
	Trash2,
	AlertTriangle,
	CheckCircle2,
	Clock,
	ExternalLink,
	Copy,
	Check,
	Loader2,
	AlertCircle,
	X
} from 'lucide-react';
import { DocSetuDocument, DocumentSection } from '@/types/docsetu';
import { getDocument, getDocumentSections, deleteDocument } from '@/services/documents';
import { translateContent } from '@/services/intelligence';
import { AiSidePanel } from '@/components/shell/AiSidePanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Tab = 'overview' | 'sections' | 'actions' | 'source' | 'activity';

export default function DocumentDetailPage({
	params
}: {
	params: Promise<{ id: string }>;
}) {
	const resolvedParams = use(params);
	const documentId = resolvedParams.id;
	const router = useRouter();

	const [document, setDocument] = useState<DocSetuDocument | null>(null);
	const [sections, setSections] = useState<DocumentSection[]>([]);
	const [activeTab, setActiveTab] = useState<Tab>('overview');
	const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [isAiOpen, setIsAiOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	// Translation state
	const [isTranslating, setIsTranslating] = useState(false);
	const [targetLang, setTargetLang] = useState('Hindi');
	const [translatedText, setTranslatedText] = useState<{
		summary: string;
		keyPoints: string[];
	} | null>(null);
	const [showTranslateModal, setShowTranslateModal] = useState(false);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const doc = await getDocument(documentId);
			setDocument(doc);
			if (doc.sections && doc.sections.length > 0) {
				setSections(doc.sections);
			} else {
				const sRes = await getDocumentSections(documentId, 0, 50);
				setSections(sRes.sections);
			}
		} catch (err) {
			console.error('Failed to load document detail', err);
		} finally {
			setLoading(false);
		}
	}, [documentId]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const handleDelete = async () => {
		if (!confirm('Remove this document from the workspace?')) return;
		try {
			await deleteDocument(documentId);
			router.push('/documents');
		} catch {
			alert('Failed to delete document');
		}
	};

	const handleCopyBrief = () => {
		if (!document) return;
		navigator.clipboard.writeText(document.briefMd || document.summary);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleTranslate = async () => {
		if (!document) return;
		setIsTranslating(true);
		try {
			const currentSec = sections[selectedSectionIndex];
			const res = await translateContent({
				language: targetLang,
				summary: currentSec ? currentSec.summary : document.summary,
				keyPoints: currentSec ? currentSec.keyPoints : document.keyPoints
			});
			setTranslatedText({ summary: res.summary, keyPoints: res.keyPoints });
		} catch {
			alert('Translation failed. Please try again.');
		} finally {
			setIsTranslating(false);
		}
	};

	if (loading) {
		return (
			<div className='p-8 max-w-6xl mx-auto space-y-6'>
				<div className='h-8 bg-white rounded-lg w-48 animate-pulse' />
				<div className='h-32 bg-white rounded-xl border border-[#E1E4DF] animate-pulse' />
				<div className='h-96 bg-white rounded-xl border border-[#E1E4DF] animate-pulse' />
			</div>
		);
	}

	if (!document) {
		return (
			<div className='p-12 max-w-xl mx-auto text-center space-y-4'>
				<div className='w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto'>
					<AlertCircle className='h-6 w-6' />
				</div>
				<h2 className='text-base font-semibold text-[#172033]'>
					Document Not Found
				</h2>
				<p className='text-xs text-[#677080]'>
					The requested document may have been deleted or moved.
				</p>
				<Link
					href='/documents'
					className='inline-flex px-4 py-2 bg-[#4656D9] text-white text-xs font-medium rounded-lg'>
					Return to Documents
				</Link>
			</div>
		);
	}

	const activeSection = sections[selectedSectionIndex];

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Back link */}
			<div>
				<Link
					href='/documents'
					className='inline-flex items-center gap-1.5 text-xs font-medium text-[#677080] hover:text-[#172033] transition-colors'>
					<ArrowLeft className='h-3.5 w-3.5' />
					<span>Documents</span>
				</Link>
			</div>

			{/* HEADER BLOCK */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4'>
				<div className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
					<div className='space-y-2.5 max-w-3xl'>
						<h1 className='text-xl md:text-2xl font-bold text-[#172033] tracking-tight'>
							{document.title}
						</h1>

						{/* Structured Chips */}
						<div className='flex flex-wrap items-center gap-2 text-xs'>
							<span className='px-2.5 py-0.5 rounded-md bg-[#4656D9]/10 text-[#4656D9] font-medium'>
								{document.type}
							</span>
							<span className='px-2.5 py-0.5 rounded-md bg-[#179C8C]/10 text-[#179C8C] font-medium'>
								{document.team}
							</span>
							<span className='px-2.5 py-0.5 rounded-md bg-[#F1F3F1] text-[#677080] font-medium'>
								{document.language}
							</span>
							<span className='text-[#9098A5]'>
								{document.pageCount} {document.pageCount === 1 ? 'page' : 'pages'}
							</span>
							<span className='text-[#9098A5]'>•</span>
							<span className='text-[#9098A5]'>
								Updated {new Date(document.uploadedAt).toLocaleDateString()}
							</span>
						</div>
					</div>

					{/* Header Actions */}
					<div className='flex flex-wrap items-center gap-2 flex-shrink-0'>
						<button
							onClick={() => setIsAiOpen(true)}
							className='inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4656D9] text-white hover:bg-[#3B4BBF] text-xs font-medium transition-colors shadow-2xs'>
							<Sparkles className='h-3.5 w-3.5' />
							<span>Ask this document</span>
						</button>

						<button
							onClick={() => setShowTranslateModal(true)}
							className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[#E1E4DF] hover:bg-[#F6F7F4] text-xs font-medium text-[#172033] transition-colors'>
							<Languages className='h-3.5 w-3.5 text-[#677080]' />
							<span>Translate</span>
						</button>

						<button
							onClick={handleDelete}
							className='p-2 rounded-lg border border-[#E1E4DF] text-[#9098A5] hover:text-red-600 hover:bg-red-50 transition-colors'
							title='Delete document'>
							<Trash2 className='h-4 w-4' />
						</button>
					</div>
				</div>

				{/* TAB NAVIGATION */}
				<div className='flex border-b border-[#E1E4DF] gap-6 pt-2 text-xs font-medium overflow-x-auto'>
					{(['overview', 'sections', 'actions', 'source', 'activity'] as const).map(tab => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`pb-3 capitalize transition-colors whitespace-nowrap flex items-center gap-1.5 ${
								activeTab === tab
									? 'border-b-2 border-[#4656D9] text-[#4656D9] font-semibold'
									: 'text-[#677080] hover:text-[#172033]'
							}`}>
							<span>{tab}</span>
							{tab === 'sections' && (
								<span className='px-1.5 py-0.2 rounded-full bg-[#F1F3F1] text-[10px] text-[#677080]'>
									{sections.length}
								</span>
							)}
							{tab === 'actions' && document.actions.length > 0 && (
								<span className='px-1.5 py-0.2 rounded-full bg-[#C77B1B]/15 text-[10px] text-[#C77B1B] font-semibold'>
									{document.actions.length}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* TAB 1: OVERVIEW */}
			{activeTab === 'overview' && (
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Left 2 Cols: Document Brief & Key Points */}
					<div className='lg:col-span-2 space-y-6'>
						{/* Document Brief */}
						<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4'>
							<div className='flex items-center justify-between'>
								<h2 className='text-sm font-semibold text-[#172033] flex items-center gap-2'>
									<Sparkles className='h-4 w-4 text-[#4656D9]' />
									<span>Document brief</span>
								</h2>
								<button
									onClick={handleCopyBrief}
									className='inline-flex items-center gap-1 text-[11px] text-[#677080] hover:text-[#172033]'>
									{copied ? (
										<Check className='h-3.5 w-3.5 text-green-600' />
									) : (
										<Copy className='h-3.5 w-3.5' />
									)}
									<span>{copied ? 'Copied' : 'Copy brief'}</span>
								</button>
							</div>

							<div className='prose prose-sm max-w-none text-[#172033] leading-relaxed text-xs'>
								{document.briefMd ? (
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{document.briefMd}
									</ReactMarkdown>
								) : (
									<p>{document.summary}</p>
								)}
							</div>
						</div>

						{/* Important Points */}
						{document.keyPoints && document.keyPoints.length > 0 && (
							<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-3'>
								<h3 className='text-sm font-semibold text-[#172033]'>
									Important points
								</h3>
								<ul className='space-y-2 text-xs text-[#172033]'>
									{document.keyPoints.map((pt, idx) => (
										<li key={idx} className='flex items-start gap-2'>
											<Check className='h-3.5 w-3.5 text-[#4656D9] mt-0.5 flex-shrink-0' />
											<span className='leading-relaxed'>{pt}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>

					{/* Right Col: Structured Key Info & Risk Callouts */}
					<div className='space-y-6'>
						{/* Priority & Risk Callout (Only if meaningful) */}
						{document.risks && document.risks.length > 0 && (
							<div className='bg-red-50/70 border border-red-200 rounded-xl p-5 space-y-2.5'>
								<div className='flex items-center gap-2 text-red-800 text-xs font-semibold uppercase tracking-wide'>
									<AlertTriangle className='h-4 w-4 text-red-600' />
									<span>Priority & Risk Notice</span>
								</div>
								{document.risks.map((r, idx) => (
									<div key={idx} className='text-xs space-y-1'>
										<p className='font-semibold text-red-900'>{r.title}</p>
										{r.description && (
											<p className='text-red-700 leading-relaxed'>
												{r.description}
											</p>
										)}
									</div>
								))}
							</div>
						)}

						{/* Key Information Card */}
						<div className='bg-white rounded-xl border border-[#E1E4DF] p-5 shadow-2xs space-y-4 text-xs'>
							<h3 className='font-semibold text-[#172033] border-b border-[#E1E4DF] pb-2'>
								Key information
							</h3>

							<div className='space-y-3'>
								<div className='flex justify-between items-center'>
									<span className='text-[#677080]'>Effective date</span>
									<span className='font-medium text-[#172033]'>
										{document.effectiveDate || 'Immediate'}
									</span>
								</div>

								<div className='flex justify-between items-center'>
									<span className='text-[#677080]'>Document Owner</span>
									<span className='font-medium text-[#172033]'>
										{document.owner || document.team}
									</span>
								</div>

								<div className='flex justify-between items-start'>
									<span className='text-[#677080]'>Affected teams</span>
									<div className='flex flex-wrap gap-1 justify-end max-w-[160px]'>
										{document.affectedTeams.map(t => (
											<span
												key={t}
												className='px-1.5 py-0.5 rounded bg-[#F1F3F1] text-[11px] text-[#172033] font-medium'>
												{t}
											</span>
										))}
									</div>
								</div>

								<div className='flex justify-between items-center'>
									<span className='text-[#677080]'>Document status</span>
									<span className='px-2 py-0.5 rounded bg-[#39825E]/10 border border-[#39825E]/20 text-[11px] font-medium text-[#39825E]'>
										Active
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TAB 2: SECTIONS (Maps from linked nodes) */}
			{activeTab === 'sections' && (
				<div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
					{/* Left: Section Index (Numbered) */}
					<div className='lg:col-span-4 bg-white rounded-xl border border-[#E1E4DF] p-3 shadow-2xs space-y-1.5 h-fit'>
						<div className='px-3 py-2 text-[11px] font-semibold text-[#9098A5] uppercase tracking-wider'>
							Table of Sections
						</div>
						{sections.map((sec, idx) => (
							<button
								key={sec.id}
								onClick={() => setSelectedSectionIndex(idx)}
								className={`w-full text-left p-3 rounded-lg text-xs transition-all flex items-center justify-between ${
									selectedSectionIndex === idx
										? 'bg-[#4656D9]/10 text-[#4656D9] font-semibold border border-[#4656D9]/30'
										: 'text-[#172033] hover:bg-[#F6F7F4]'
								}`}>
								<div className='flex items-center gap-2.5 truncate'>
									<span className='text-xs font-mono text-[#9098A5] w-4'>
										{idx + 1}
									</span>
									<span className='truncate'>{sec.title}</span>
								</div>
								<span className='text-[10px] text-[#9098A5] whitespace-nowrap ml-2'>
									pp. {sec.pageRange.start}–{sec.pageRange.end}
								</span>
							</button>
						))}
					</div>

					{/* Right: Selected Section Detail */}
					<div className='lg:col-span-8 bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-6'>
						{activeSection ? (
							<>
								<div className='flex items-center justify-between border-b border-[#E1E4DF] pb-4'>
									<div>
										<span className='text-[11px] font-semibold text-[#4656D9] uppercase tracking-wider'>
											Section {selectedSectionIndex + 1}
										</span>
										<h2 className='text-base font-bold text-[#172033] mt-0.5'>
											{activeSection.title}
										</h2>
										<p className='text-xs text-[#9098A5]'>
											Pages {activeSection.pageRange.start}–{activeSection.pageRange.end}
										</p>
									</div>

									<button
										onClick={() => {
											window.dispatchEvent(
												new CustomEvent('open-docsetu-ai', {
													detail: {
														question: `Summarize the requirements in ${activeSection.title}`,
														docId: document.id
													}
												})
											);
										}}
										className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#4656D9]/30 text-[#4656D9] bg-[#4656D9]/5 hover:bg-[#4656D9]/10 text-xs font-medium transition-colors'>
										<Sparkles className='h-3.5 w-3.5' />
										<span>Ask about section</span>
									</button>
								</div>

								{/* AI Summary */}
								<div className='space-y-2'>
									<h4 className='text-xs font-semibold text-[#172033] uppercase tracking-wider'>
										AI Summary
									</h4>
									<p className='text-xs text-[#172033] leading-relaxed bg-[#F6F7F4] p-4 rounded-lg border border-[#E1E4DF]'>
										{activeSection.summary}
									</p>
								</div>

								{/* Key details */}
								{activeSection.keyPoints && activeSection.keyPoints.length > 0 && (
									<div className='space-y-2'>
										<h4 className='text-xs font-semibold text-[#172033] uppercase tracking-wider'>
											Key Details
										</h4>
										<ul className='space-y-1.5 text-xs text-[#172033]'>
											{activeSection.keyPoints.map((kp, kIdx) => (
												<li key={kIdx} className='flex items-start gap-2'>
													<CheckCircle2 className='h-3.5 w-3.5 text-[#179C8C] mt-0.5 flex-shrink-0' />
													<span>{kp}</span>
												</li>
											))}
										</ul>
									</div>
								)}

								{/* Affected Teams */}
								{activeSection.affectedTeams && activeSection.affectedTeams.length > 0 && (
									<div className='space-y-2'>
										<h4 className='text-xs font-semibold text-[#172033] uppercase tracking-wider'>
											Affected Teams
										</h4>
										<div className='flex flex-wrap gap-1.5'>
											{activeSection.affectedTeams.map((t, tIdx) => (
												<span
													key={tIdx}
													className='px-2 py-0.5 bg-[#F1F3F1] border border-[#E1E4DF] rounded text-xs font-medium text-[#172033]'>
													{t}
												</span>
											))}
										</div>
									</div>
								)}

								{/* Source Snippet */}
								{activeSection.sourceContent && (
									<details className='pt-4 border-t border-[#E1E4DF]'>
										<summary className='text-xs font-semibold text-[#4656D9] cursor-pointer hover:underline'>
											View Source Text (Pages {activeSection.pageRange.start}–{activeSection.pageRange.end})
										</summary>
										<div className='mt-3 p-4 bg-[#F6F7F4] rounded-lg border border-[#E1E4DF] text-xs font-mono text-[#172033] whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed'>
											{activeSection.sourceContent}
										</div>
									</details>
								)}
							</>
						) : (
							<p className='text-xs text-[#677080]'>No sections available.</p>
						)}
					</div>
				</div>
			)}

			{/* TAB 3: ACTIONS (First-Class Capability) */}
			{activeTab === 'actions' && (
				<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-6'>
					<div>
						<h2 className='text-base font-bold text-[#172033]'>
							Actions identified in this document
						</h2>
						<p className='text-xs text-[#677080] mt-0.5'>
							Responsibilities, compliance deadlines, and procedural changes extracted by DocSetu
						</p>
					</div>

					{/* OPEN ACTIONS */}
					<div className='space-y-3'>
						<div className='text-xs font-semibold text-[#172033] uppercase tracking-wider'>
							Open Responsibilities & Deadlines
						</div>
						{document.actions.filter(a => a.type === 'action').length === 0 ? (
							<p className='text-xs text-[#9098A5] italic'>
								No open action items pending for this document.
							</p>
						) : (
							<div className='space-y-2.5'>
								{document.actions
									.filter(a => a.type === 'action')
									.map(action => (
										<div
											key={action.id}
											className='p-4 rounded-xl border border-[#E1E4DF] bg-[#F6F7F4]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
											<div className='space-y-1 flex-1'>
												<p className='text-xs font-semibold text-[#172033]'>
													{action.action}
												</p>
												<div className='flex items-center gap-2 text-[11px] text-[#677080]'>
													<span className='px-2 py-0.5 bg-white border border-[#E1E4DF] rounded font-medium text-[#172033]'>
														{action.team}
													</span>
													{action.sectionTitle && (
														<span>• Surfaced in {action.sectionTitle}</span>
													)}
												</div>
											</div>

											{action.dueDate ? (
												<div className='flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 whitespace-nowrap self-start sm:self-center'>
													<Clock className='h-3.5 w-3.5 text-amber-600' />
													<span>Due {action.dueDate}</span>
												</div>
											) : (
												<span className='text-[11px] text-[#9098A5]'>
													No deadline specified
												</span>
											)}
										</div>
									))}
							</div>
						)}
					</div>

					{/* INFORMATION NOTICES */}
					<div className='space-y-3 pt-4 border-t border-[#E1E4DF]'>
						<div className='text-xs font-semibold text-[#677080] uppercase tracking-wider'>
							Informational & Transitional Notices
						</div>
						{document.actions.filter(a => a.type === 'information').map(info => (
							<div
								key={info.id}
								className='p-3.5 rounded-lg border border-[#E1E4DF] bg-white flex items-center justify-between text-xs'>
								<span className='text-[#172033]'>{info.action}</span>
								<span className='text-[11px] text-[#9098A5] italic whitespace-nowrap ml-4'>
									No action required
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* TAB 4: SOURCE PREVIEW */}
			{activeTab === 'source' && (
				<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4'>
					<div className='flex items-center justify-between pb-3 border-b border-[#E1E4DF]'>
						<div>
							<h3 className='text-sm font-semibold text-[#172033]'>
								Source Document Content
							</h3>
							<p className='text-xs text-[#677080]'>
								Original text preservation for auditability and source grounding
							</p>
						</div>
						{document.rawUrl && (
							<a
								href={document.rawUrl}
								target='_blank'
								rel='noreferrer'
								className='inline-flex items-center gap-1 text-xs text-[#4656D9] hover:underline'>
								<span>Open Raw File</span>
								<ExternalLink className='h-3.5 w-3.5' />
							</a>
						)}
					</div>

					<div className='p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] max-h-[550px] overflow-y-auto font-mono text-xs text-[#172033] leading-relaxed whitespace-pre-wrap'>
						{sections.map(s => s.sourceContent).filter(Boolean).join('\n\n--- SECTION BREAK ---\n\n') ||
							document.summary}
					</div>
				</div>
			)}

			{/* TAB 5: ACTIVITY TIMELINE */}
			{activeTab === 'activity' && (
				<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4'>
					<h3 className='text-sm font-semibold text-[#172033]'>
						Document Activity & Audit History
					</h3>

					<div className='relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E1E4DF]'>
						<div className='relative space-y-1'>
							<div className='absolute -left-[27px] top-0.5 w-4 h-4 rounded bg-[#F6F7F4] border border-[#E1E4DF] text-[#39825E] flex items-center justify-center'>
								<Check className='h-2.5 w-2.5' />
							</div>
							<p className='text-xs font-semibold text-[#172033]'>
								Document analyzed and indexed into workspace
							</p>
							<p className='text-[11px] text-[#9098A5]'>
								{new Date(document.uploadedAt).toLocaleString()}
							</p>
						</div>

						<div className='relative space-y-1'>
							<div className='absolute -left-[27px] top-0.5 w-4 h-4 rounded bg-[#F6F7F4] border border-[#E1E4DF] text-[#4656D9] flex items-center justify-center'>
								<Clock className='h-2.5 w-2.5' />
							</div>
							<p className='text-xs font-semibold text-[#172033]'>
								Initial upload completed by team member
							</p>
							<p className='text-[11px] text-[#9098A5]'>
								{new Date(document.uploadedAt).toLocaleDateString()}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* TRANSLATE MODAL */}
			{showTranslateModal && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs'>
					<div className='bg-white rounded-2xl max-w-md w-full p-6 border border-[#E1E4DF] shadow-2xl space-y-4'>
						<div className='flex items-center justify-between border-b border-[#E1E4DF] pb-3'>
							<div className='flex items-center gap-2 text-sm font-semibold text-[#172033]'>
								<Languages className='h-4 w-4 text-[#4656D9]' />
								<span>Translate Document Content</span>
							</div>
							<button
								onClick={() => setShowTranslateModal(false)}
								className='p-1 text-[#9098A5] hover:text-[#172033]'>
								<X className='h-4 w-4' />
							</button>
						</div>

						<div className='space-y-3'>
							<label className='block text-xs font-semibold text-[#172033]'>
								Target Language
							</label>
							<select
								value={targetLang}
								onChange={e => setTargetLang(e.target.value)}
								className='w-full p-2.5 text-xs bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'>
								<option value='Hindi'>Hindi</option>
								<option value='Malayalam'>Malayalam</option>
								<option value='Tamil'>Tamil</option>
								<option value='English'>English</option>
							</select>

							<button
								onClick={handleTranslate}
								disabled={isTranslating}
								className='w-full py-2.5 bg-[#4656D9] text-white text-xs font-medium rounded-lg hover:bg-[#3B4BBF] flex items-center justify-center gap-2 disabled:opacity-50'>
								{isTranslating ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : (
									<Sparkles className='h-4 w-4' />
								)}
								<span>{isTranslating ? 'Translating…' : 'Generate Translation'}</span>
							</button>

							{translatedText && (
								<div className='mt-4 p-3 bg-[#F6F7F4] rounded-lg border border-[#E1E4DF] space-y-2 text-xs'>
									<div className='font-semibold text-[#172033]'>
										Translated Summary ({targetLang})
									</div>
									<p className='text-[#172033] leading-relaxed'>
										{translatedText.summary}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* AI Side Panel Drawer */}
			<AiSidePanel
				isOpen={isAiOpen}
				onClose={() => setIsAiOpen(false)}
				docId={document.id}
				docTitle={document.title}
			/>
		</div>
	);
}

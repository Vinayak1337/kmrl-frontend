'use client';

import React, { useState, useRef } from 'react';
import {
	X,
	Upload,
	CheckCircle2,
	AlertCircle,
	ArrowRight,
	Loader2,
	Sparkles
} from 'lucide-react';
import { DocSetuSymbol } from '@/components/brand/DocSetuBrand';
import { VALID_TEAMS, VALID_DOC_TYPES } from '@/adapters/documentAdapter';
import { uploadDocument } from '@/services/documents';
import { TeamName, DocSetuDocumentType } from '@/types/docsetu';

interface DocumentIngestModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess?: (docId: string) => void;
}

type Step = 'file' | 'metadata' | 'processing' | 'done';

export function DocumentIngestModal({
	isOpen,
	onClose,
	onSuccess
}: DocumentIngestModalProps) {
	const [step, setStep] = useState<Step>('file');
	const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');

	// Form State
	const [file, setFile] = useState<File | null>(null);
	const [fileBase64, setFileBase64] = useState<string>('');
	const [pastedText, setPastedText] = useState('');
	const [title, setTitle] = useState('');
	const [team, setTeam] = useState<TeamName>('Operations');
	const [docType, setDocType] = useState<DocSetuDocumentType>('Policy');
	const [language, setLanguage] = useState('English');
	const [tagsInput, setTagsInput] = useState('');
	const [error, setError] = useState<string | null>(null);

	// Processing stages
	const [pipelineIndex, setPipelineIndex] = useState(0);
	const [newDocId, setNewDocId] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const resetModal = () => {
		setStep('file');
		setInputMode('upload');
		setFile(null);
		setFileBase64('');
		setPastedText('');
		setTitle('');
		setTeam('Operations');
		setDocType('Policy');
		setTagsInput('');
		setError(null);
		setPipelineIndex(0);
		setNewDocId(null);
	};

	const handleFileSelect = (selectedFile: File) => {
		setFile(selectedFile);
		setError(null);

		// Pre-populate title from filename
		const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
		const autoTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
		setTitle(autoTitle);

		// Read file as base64
		const reader = new FileReader();
		reader.onload = () => {
			const res = reader.result as string;
			// Strip data URL prefix if base64
			const base64 = res.includes(',') ? res.split(',')[1] : res;
			setFileBase64(base64);
			setStep('metadata');
		};
		reader.onerror = () => {
			setError('Failed to read file. Please try another file.');
		};

		if (selectedFile.type.includes('text') || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md')) {
			reader.readAsText(selectedFile);
		} else {
			reader.readAsDataURL(selectedFile);
		}
	};

	const handlePasteProceed = () => {
		if (!pastedText.trim()) {
			setError('Please paste document text to proceed.');
			return;
		}
		setError(null);
		if (!title) setTitle('Untitled Document');
		setStep('metadata');
	};

	const handleStartIngest = async () => {
		if (!title.trim()) {
			setError('Document title is required.');
			return;
		}

		setError(null);
		setStep('processing');
		setPipelineIndex(0);

		// Pipeline stages for live feedback
		const stages = [
			'File uploaded',
			'Text extracted',
			'Identifying structure',
			'Creating document summary',
			'Finding actions & deadlines',
			'Making document searchable'
		];

		// Animate stages smoothly
		const interval = setInterval(() => {
			setPipelineIndex(prev => {
				if (prev < stages.length - 1) return prev + 1;
				return prev;
			});
		}, 600);

		try {
			const tags = tagsInput
				.split(',')
				.map(t => t.trim())
				.filter(Boolean);

			const format = file ? (file.name.endsWith('.pdf') ? 'pdf' : 'text') : 'text';

			const res = await uploadDocument({
				title,
				team,
				type: docType,
				tags,
				fileContent: fileBase64 || undefined,
				fileName: file?.name,
				format,
				text: pastedText || undefined
			});

			clearInterval(interval);
			setPipelineIndex(stages.length);
			setNewDocId(res.id);
			setStep('done');
		} catch (err: unknown) {
			clearInterval(interval);
			const msg = err instanceof Error ? err.message : 'Document ingestion failed. Please try again.';
			setError(msg);
			setStep('metadata');
		}
	};

	if (!isOpen) return null;

	const stages = [
		'File uploaded',
		'Text extracted',
		'Identifying structure',
		'Creating document summary',
		'Finding actions & deadlines',
		'Making document searchable'
	];

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200'>
			<div className='relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden'>
				{/* Modal Header */}
				<div className='flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50/70'>
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs'>
							<DocSetuSymbol size='sm' />
						</div>
						<div>
							<h2 className='text-base font-semibold text-[#0F172A]'>
								Add document to DocSetu
							</h2>
							<p className='text-xs text-slate-500'>
								Ingest source documents into the intelligence layer
							</p>
						</div>
					</div>

					<button
						onClick={() => {
							resetModal();
							onClose();
						}}
						className='p-1.5 text-slate-400 hover:text-[#0F172A] rounded-md hover:bg-white transition-colors'>
						<X className='h-5 w-5' />
					</button>
				</div>

				{/* Modal Body */}
				<div className='p-6'>
					{error && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700'>
							<AlertCircle className='h-4 w-4 flex-shrink-0' />
							<span>{error}</span>
						</div>
					)}

					{/* STEP 1: FILE DROP OR PASTE */}
					{step === 'file' && (
						<div className='space-y-4'>
							{/* Tab selector */}
							<div className='flex border-b border-slate-200 pb-2 gap-4 text-xs font-medium'>
								<button
									onClick={() => setInputMode('upload')}
									className={`pb-1 transition-colors ${
										inputMode === 'upload'
											? 'text-[#2563EB] border-b-2 border-[#2563EB] font-semibold'
											: 'text-slate-500 hover:text-[#0F172A]'
									}`}>
									Upload Document
								</button>
								<button
									onClick={() => setInputMode('paste')}
									className={`pb-1 transition-colors ${
										inputMode === 'paste'
											? 'text-[#2563EB] border-b-2 border-[#2563EB] font-semibold'
											: 'text-slate-500 hover:text-[#0F172A]'
									}`}>
									Paste Text Content
								</button>
							</div>

							{inputMode === 'upload' ? (
								<div
									onDragOver={e => e.preventDefault()}
									onDrop={e => {
										e.preventDefault();
										if (e.dataTransfer.files && e.dataTransfer.files[0]) {
											handleFileSelect(e.dataTransfer.files[0]);
										}
									}}
									onClick={() => fileInputRef.current?.click()}
									className='border-2 border-dashed border-slate-200 hover:border-[#2563EB] rounded-xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 cursor-pointer transition-all'>
									<input
										ref={fileInputRef}
										type='file'
										accept='.pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg'
										className='hidden'
										onChange={e => {
											if (e.target.files && e.target.files[0]) {
												handleFileSelect(e.target.files[0]);
											}
										}}
									/>
									<div className='w-12 h-12 rounded-full bg-white border border-slate-200 text-[#2563EB] flex items-center justify-center mx-auto mb-3 shadow-xs'>
										<Upload className='h-6 w-6' />
									</div>
									<h3 className='text-sm font-semibold text-[#0F172A] mb-1'>
										Choose a file or drag & drop here
									</h3>
									<p className='text-xs text-slate-500 mb-3'>
										Supported formats: PDF, DOCX, Images, Text
									</p>
									<span className='inline-flex px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-[#0F172A] shadow-xs'>
										Browse Files
									</span>
								</div>
							) : (
								<div className='space-y-3'>
									<textarea
										value={pastedText}
										onChange={e => setPastedText(e.target.value)}
										rows={7}
										placeholder='Paste raw agreement text, circular content, or operational policy here…'
										className='w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white font-mono'
									/>
									<div className='flex justify-end'>
										<button
											type='button'
											onClick={handlePasteProceed}
											className='px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1D4ED8] flex items-center gap-1.5 transition-colors'>
											<span>Next: Metadata</span>
											<ArrowRight className='h-3.5 w-3.5' />
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* STEP 2: METADATA */}
					{step === 'metadata' && (
						<div className='space-y-4'>
							<div className='flex items-center justify-between pb-3 border-b border-slate-200 text-xs'>
								<span className='text-slate-500 font-medium'>Source:</span>
								<span className='font-semibold text-[#0F172A] truncate max-w-[280px]'>
									{file ? file.name : 'Pasted Text Slice'}
								</span>
							</div>

							<div>
								<label className='block text-xs font-semibold text-[#0F172A] mb-1'>
									Document Title *
								</label>
								<input
									type='text'
									value={title}
									onChange={e => setTitle(e.target.value)}
									placeholder='e.g. Master Services Agreement FY26'
									className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white'
								/>
							</div>

							<div className='grid grid-cols-2 gap-3'>
								<div>
									<label className='block text-xs font-semibold text-[#0F172A] mb-1'>
										Team / Owner
									</label>
									<select
										value={team}
										onChange={e => setTeam(e.target.value as TeamName)}
										className='w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
										{VALID_TEAMS.map(t => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className='block text-xs font-semibold text-[#0F172A] mb-1'>
										Document Type
									</label>
									<select
										value={docType}
										onChange={e => setDocType(e.target.value as DocSetuDocumentType)}
										className='w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
										{VALID_DOC_TYPES.map(t => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-3'>
								<div>
									<label className='block text-xs font-semibold text-[#0F172A] mb-1'>
										Language
									</label>
									<select
										value={language}
										onChange={e => setLanguage(e.target.value)}
										className='w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
										<option value='English'>English (Auto-detect)</option>
										<option value='Hindi'>Hindi</option>
										<option value='Malayalam'>Malayalam</option>
										<option value='Tamil'>Tamil</option>
									</select>
								</div>

								<div>
									<label className='block text-xs font-semibold text-[#0F172A] mb-1'>
										Tags (comma separated)
									</label>
									<input
										type='text'
										value={tagsInput}
										onChange={e => setTagsInput(e.target.value)}
										placeholder='SLA, FY26, Compliance'
										className='w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white'
									/>
								</div>
							</div>

							<div className='flex items-center justify-between pt-3 border-t border-slate-200'>
								<button
									type='button'
									onClick={() => setStep('file')}
									className='px-3 py-1.5 text-xs text-slate-500 hover:text-[#0F172A]'>
									Back
								</button>
								<button
									type='button'
									onClick={handleStartIngest}
									className='px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1D4ED8] flex items-center gap-1.5 shadow-xs transition-colors'>
									<Sparkles className='h-3.5 w-3.5' />
									<span>Process Document</span>
								</button>
							</div>
						</div>
					)}

					{/* STEP 3: PROCESSING PROGRESS */}
					{step === 'processing' && (
						<div className='py-6 text-center space-y-6'>
							<div className='relative w-14 h-14 mx-auto flex items-center justify-center animate-pulse'>
								<DocSetuSymbol size='lg' />
							</div>

							<div>
								<h3 className='text-sm font-semibold text-[#0F172A]'>
									Processing Document
								</h3>
								<p className='text-xs text-slate-500 mt-0.5'>
									Extracting text, sections, and action items
								</p>
							</div>

							{/* Pipeline Stages Checklist */}
							<div className='max-w-xs mx-auto text-left space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200'>
								{stages.map((stg, idx) => {
									const isCompleted = idx < pipelineIndex;
									const isCurrent = idx === pipelineIndex;
									return (
										<div
											key={idx}
											className={`flex items-center gap-2.5 text-xs transition-colors ${
												isCompleted
													? 'text-[#0D9488] font-medium'
													: isCurrent
													? 'text-[#2563EB] font-semibold'
													: 'text-slate-400'
											}`}>
											{isCompleted ? (
												<CheckCircle2 className='h-4 w-4 text-[#0D9488] flex-shrink-0' />
											) : isCurrent ? (
												<Loader2 className='h-4 w-4 animate-spin text-[#2563EB] flex-shrink-0' />
											) : (
												<div className='w-3.5 h-3.5 rounded-xs border border-slate-300 flex-shrink-0' />
											)}
											<span>{stg}</span>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* STEP 4: DONE */}
					{step === 'done' && (
						<div className='py-6 text-center space-y-5'>
							<div className='w-12 h-12 rounded-full bg-emerald-50 text-[#0D9488] border border-emerald-200 flex items-center justify-center mx-auto'>
								<CheckCircle2 className='h-7 w-7' />
							</div>

							<div>
								<h3 className='text-base font-semibold text-[#0F172A]'>
									Document Ready in Workspace
								</h3>
								<p className='text-xs text-slate-500 mt-1 max-w-sm mx-auto'>
									&ldquo;{title}&rdquo; has been analyzed. Summaries, sections, and actionable deadlines are now structured and searchable.
								</p>
							</div>

							<div className='flex justify-center gap-3 pt-2'>
								<button
									type='button'
									onClick={() => {
										resetModal();
										onClose();
									}}
									className='px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-[#0F172A] hover:bg-slate-50'>
									Close
								</button>
								{newDocId && (
									<button
										type='button'
										onClick={() => {
											resetModal();
											onClose();
											if (onSuccess) onSuccess(newDocId);
											window.location.href = `/documents/${newDocId}`;
										}}
										className='px-4 py-2 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1D4ED8] flex items-center gap-1.5 shadow-xs transition-colors'>
										<span>Open Document Workspace</span>
										<ArrowRight className='h-3.5 w-3.5' />
									</button>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

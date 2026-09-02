'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, FileText, ArrowRight, X, Loader2 } from 'lucide-react';
import { searchDocuments } from '@/services/intelligence';

interface SearchItem {
	id?: string;
	documentId?: string;
	title?: string;
	documentTitle?: string;
	summary?: string;
	nodeSummary?: string;
}

interface OmniboxProps {
	className?: string;
	onAskDocSetu?: (question: string) => void;
	placeholder?: string;
}

export function Omnibox({
	className = '',
	onAskDocSetu,
	placeholder = 'Search documents or ask DocSetu…'
}: OmniboxProps) {
	const router = useRouter();
	const [query, setQuery] = useState('');
	const [mode, setMode] = useState<'all' | 'documents' | 'ask'>('all');
	const [isFocused, setIsFocused] = useState(false);
	const [results, setResults] = useState<SearchItem[]>([]);
	const [loading, setLoading] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// Debounced search on typing
	useEffect(() => {
		const trimmed = query.trim();
		if (!trimmed || mode === 'ask' || trimmed.length < 2) {
			setResults([]);
			return;
		}

		const timer = setTimeout(async () => {
			setLoading(true);
			try {
				const res = await searchDocuments({ query: trimmed, limit: 5 });
				setResults(res);
			} catch {
				setResults([]);
			} finally {
				setLoading(false);
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [query, mode]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsFocused(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;

		// If user asks a question or mode is 'ask', trigger AI assistant or navigate to /intelligence
		const isQuestion =
			mode === 'ask' ||
			/^(what|which|who|where|when|why|how|summarize|list|explain|show|can)\b/i.test(trimmed) ||
			trimmed.endsWith('?');

		if (isQuestion) {
			if (onAskDocSetu) {
				onAskDocSetu(trimmed);
				setIsFocused(false);
			} else {
				router.push(`/intelligence?q=${encodeURIComponent(trimmed)}`);
				setIsFocused(false);
			}
		} else {
			// Document search mode
			router.push(`/documents?q=${encodeURIComponent(trimmed)}`);
			setIsFocused(false);
		}
	};

	return (
		<div ref={containerRef} className={`relative w-full max-w-2xl ${className}`}>
			<form
				onSubmit={handleSubmit}
				className={`flex items-center w-full bg-white rounded-lg border transition-all duration-200 ${
					isFocused
						? 'border-[#4656D9] ring-2 ring-[#4656D9]/15 shadow-sm'
						: 'border-[#E1E4DF] hover:border-[#CBD5E1]'
				}`}>
				{/* Mode Indicator / Icon */}
				<div className='pl-3.5 pr-2 text-[#677080] flex items-center'>
					{mode === 'ask' ? (
						<Sparkles className='h-4 w-4 text-[#4656D9]' />
					) : (
						<Search className='h-4 w-4 text-[#677080]' />
					)}
				</div>

				{/* Input */}
				<input
					type='text'
					value={query}
					onChange={e => setQuery(e.target.value)}
					onFocus={() => setIsFocused(true)}
					onKeyDown={e => {
						if (e.key === 'Enter') handleSubmit();
						if (e.key === 'Escape') setIsFocused(false);
					}}
					placeholder={
						mode === 'ask'
							? 'Ask a question across all documents…'
							: mode === 'documents'
							? 'Search document titles, content, or tags…'
							: placeholder
					}
					className='w-full py-2.5 text-sm text-[#172033] placeholder-[#9098A5] bg-transparent outline-none'
				/>

				{/* Loading indicator */}
				{loading && (
					<Loader2 className='h-4 w-4 text-[#9098A5] animate-spin mr-2 flex-shrink-0' />
				)}

				{/* Clear button */}
				{query && (
					<button
						type='button'
						onClick={() => {
							setQuery('');
							setResults([]);
						}}
						className='p-1 text-[#9098A5] hover:text-[#172033] mr-1'>
						<X className='h-3.5 w-3.5' />
					</button>
				)}

				{/* Mode Switcher Buttons */}
				<div className='flex items-center gap-1 pr-2 pl-1 border-l border-[#E1E4DF] py-1 my-1'>
					{(['all', 'documents', 'ask'] as const).map(m => (
						<button
							key={m}
							type='button'
							onClick={() => setMode(m)}
							className={`px-2 py-1 text-[11px] font-medium rounded capitalize transition-colors ${
								mode === m
									? 'bg-[#4656D9]/10 text-[#4656D9]'
									: 'text-[#677080] hover:bg-[#F1F3F1] hover:text-[#172033]'
							}`}>
							{m}
						</button>
					))}
				</div>
			</form>

			{/* Dropdown Suggestions / Quick Results */}
			{isFocused && query.trim().length >= 2 && (
				<div className='absolute left-0 right-0 top-full mt-1.5 bg-white rounded-lg border border-[#E1E4DF] shadow-lg overflow-hidden z-50 animate-in fade-in-50 duration-100'>
					{/* Ask Prompt Action */}
					<div
						onClick={() => handleSubmit()}
						className='flex items-center justify-between p-3 border-b border-[#E1E4DF] hover:bg-[#F6F7F4] cursor-pointer text-sm'>
						<div className='flex items-center gap-2.5 text-[#4656D9] font-medium'>
							<Sparkles className='h-4 w-4 text-[#4656D9] flex-shrink-0' />
							<span>
								Ask DocSetu: <span className='text-[#172033] font-normal'>&ldquo;{query}&rdquo;</span>
							</span>
						</div>
						<div className='flex items-center text-xs text-[#9098A5] gap-1'>
							<span>Enter</span>
							<ArrowRight className='h-3 w-3' />
						</div>
					</div>

					{/* Document Matches */}
					{results.length > 0 && (
						<div className='p-2'>
							<div className='px-2.5 py-1 text-[11px] font-semibold text-[#9098A5] uppercase tracking-wider'>
								Matching Documents
							</div>
							{results.map((r, idx) => (
								<div
									key={r.id || r.documentId || idx}
									onClick={() => {
										router.push(`/documents/${r.documentId || r.id}`);
										setIsFocused(false);
									}}
									className='flex items-start gap-2.5 p-2 rounded-md hover:bg-[#F1F3F1] cursor-pointer'>
									<FileText className='h-4 w-4 text-[#677080] mt-0.5 flex-shrink-0' />
									<div className='min-w-0 flex-1'>
										<div className='text-xs font-semibold text-[#172033] truncate'>
											{r.title || r.documentTitle || 'Untitled Document'}
										</div>
										<div className='text-[11px] text-[#677080] line-clamp-1 mt-0.5'>
											{r.summary || r.nodeSummary || 'Section match in document'}
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* Quick Search All */}
					<div
						onClick={() => {
							router.push(`/documents?q=${encodeURIComponent(query)}`);
							setIsFocused(false);
						}}
						className='p-2.5 bg-[#F6F7F4] border-t border-[#E1E4DF] text-xs text-[#677080] hover:text-[#172033] cursor-pointer flex items-center justify-between'>
						<span>Search all documents containing &ldquo;{query}&rdquo;</span>
						<ArrowRight className='h-3 w-3 text-[#9098A5]' />
					</div>
				</div>
			)}
		</div>
	);
}

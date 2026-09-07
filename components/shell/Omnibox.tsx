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
	placeholder = 'Search documents or ask AI…'
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

	// Keyboard shortcut (Cmd+K or Ctrl+K)
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setIsFocused(true);
				const inputEl = containerRef.current?.querySelector('input');
				inputEl?.focus();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;

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
			router.push(`/documents?q=${encodeURIComponent(trimmed)}`);
			setIsFocused(false);
		}
	};

	return (
		<div ref={containerRef} className={`relative w-full max-w-2xl ${className}`}>
			<form
				onSubmit={handleSubmit}
				className={`flex items-center w-full bg-white rounded-full border transition-all duration-200 ${
					isFocused
						? 'border-[#3B49DF] ring-3 ring-[#3B49DF]/10 shadow-sm'
						: 'border-[#E5E7EB] hover:border-[#CBD5E1]'
				}`}>
				{/* Mode Icon */}
				<div className='pl-4 pr-2 text-[#6B7280] flex items-center'>
					{mode === 'ask' ? (
						<Sparkles className='h-4 w-4 text-[#3B49DF]' />
					) : (
						<Search className='h-4 w-4 text-[#6B7280]' />
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
							? 'Search titles, sections, or tags…'
							: placeholder
					}
					className='w-full py-2.5 text-xs text-[#111827] placeholder-[#9CA3AF] bg-transparent outline-none'
				/>

				{/* Loading indicator */}
				{loading && (
					<Loader2 className='h-3.5 w-3.5 text-[#9CA3AF] animate-spin mr-2 flex-shrink-0' />
				)}

				{/* Clear button */}
				{query && (
					<button
						type='button'
						onClick={() => {
							setQuery('');
							setResults([]);
						}}
						className='p-1 text-[#9CA3AF] hover:text-[#111827] mr-1'
						aria-label='Clear search'>
						<X className='h-3 w-3' />
					</button>
				)}

				{/* Keyboard shortcut indicator */}
				{!query && !isFocused && (
					<div className='hidden sm:flex items-center pr-3'>
						<kbd className='kbd-pill'>⌘K</kbd>
					</div>
				)}

				{/* Mode Switcher Buttons */}
				<div className='flex items-center gap-1 pr-2.5 pl-1 border-l border-[#E5E7EB] py-1 my-1'>
					{(['all', 'documents', 'ask'] as const).map(m => (
						<button
							key={m}
							type='button'
							onClick={() => setMode(m)}
							className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize transition-all ${
								mode === m
									? 'bg-[#EEF2FF] text-[#3B49DF] font-semibold'
									: 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
							}`}>
							{m}
						</button>
					))}
				</div>
			</form>

			{/* Dropdown Suggestions / Quick Results */}
			{isFocused && query.trim().length >= 2 && (
				<div className='absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden z-50 animate-in fade-in-50 duration-100'>
					{/* Ask Prompt Action */}
					<div
						onClick={() => handleSubmit()}
						className='flex items-center justify-between p-3.5 border-b border-[#E5E7EB] hover:bg-[#F8F9FA] cursor-pointer text-xs'>
						<div className='flex items-center gap-2 text-[#3B49DF] font-medium'>
							<Sparkles className='h-4 w-4 text-[#3B49DF] flex-shrink-0' />
							<span>
								Ask DocSetu: <span className='text-[#111827] font-normal'>&ldquo;{query}&rdquo;</span>
							</span>
						</div>
						<div className='flex items-center text-[10px] text-[#9CA3AF] gap-1'>
							<span>Enter</span>
							<ArrowRight className='h-3 w-3' />
						</div>
					</div>

					{/* Document Matches */}
					{results.length > 0 && (
						<div className='p-2'>
							<div className='px-2.5 py-1 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider'>
								Matching Documents
							</div>
							{results.map((r, idx) => (
								<div
									key={r.id || r.documentId || idx}
									onClick={() => {
										router.push(`/documents/${r.documentId || r.id}`);
										setIsFocused(false);
									}}
									className='flex items-start gap-2.5 p-2 rounded-xl hover:bg-[#F3F4F6] cursor-pointer transition-colors'>
									<FileText className='h-4 w-4 text-[#6B7280] mt-0.5 flex-shrink-0' />
									<div className='min-w-0 flex-1'>
										<div className='text-xs font-semibold text-[#111827] truncate'>
											{r.title || r.documentTitle || 'Untitled Document'}
										</div>
										<div className='text-[11px] text-[#6B7280] line-clamp-1 mt-0.5'>
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
						className='p-3 bg-[#F8F9FA] border-t border-[#E5E7EB] text-xs text-[#6B7280] hover:text-[#111827] cursor-pointer flex items-center justify-between transition-colors'>
						<span>View all matching results for &ldquo;{query}&rdquo;</span>
						<ArrowRight className='h-3.5 w-3.5 text-[#9CA3AF]' />
					</div>
				</div>
			)}
		</div>
	);
}

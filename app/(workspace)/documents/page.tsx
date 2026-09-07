'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	Search,
	Plus,
	Grid,
	List,
	Trash2,
	Eye,
	Sparkles
} from 'lucide-react';
import { DocSetuDocument } from '@/types/docsetu';
import { listDocuments, deleteDocument } from '@/services/documents';
import { VALID_TEAMS, VALID_DOC_TYPES } from '@/adapters/documentAdapter';
import { DocumentIngestModal } from '@/components/documents/DocumentIngestModal';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

export default function DocumentsPage() {
	const router = useRouter();
	const [documents, setDocuments] = useState<DocSetuDocument[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedTeam, setSelectedTeam] = useState('All');
	const [selectedType, setSelectedType] = useState('All');
	const [selectedLanguage, setSelectedLanguage] = useState('All');
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [isIngestOpen, setIsIngestOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await listDocuments({
				team: selectedTeam,
				type: selectedType,
				search: searchQuery,
				pageSize: 50
			});
			setDocuments(res.documents);
		} catch (err) {
			console.error('Failed to load documents', err);
		} finally {
			setLoading(false);
		}
	}, [selectedTeam, selectedType, searchQuery]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		if (!confirm('Remove this document from the intelligence workspace?')) return;
		setDeletingId(id);
		try {
			await deleteDocument(id);
			setDocuments(prev => prev.filter(d => d.id !== id));
		} catch {
			alert('Failed to delete document');
		} finally {
			setDeletingId(null);
		}
	};

	const openAiForDoc = (doc: DocSetuDocument, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		window.dispatchEvent(
			new CustomEvent('open-docsetu-ai', {
				detail: {
					question: `What are the key requirements and deadlines in ${doc.title}?`,
					docId: doc.id
				}
			})
		);
	};

	// Client-side language filtering if chosen
	const filteredDocs = documents.filter(doc => {
		if (selectedLanguage !== 'All' && doc.language !== selectedLanguage) return false;
		return true;
	});

	return (
		<div className='p-5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-[#0F172A] tracking-tight'>
						Documents
					</h1>
					<p className='text-sm text-slate-500 mt-0.5'>
						Operational repository, standard circulars, agreements, and technical manuals.
					</p>
				</div>

				<button
					onClick={() => setIsIngestOpen(true)}
					className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-xs font-semibold transition-all shadow-xs w-fit'>
					<Plus className='h-4 w-4' />
					<span>Add document</span>
				</button>
			</div>

			{/* Filter & Search Bar */}
			<div className='card-bezel'>
				<div className='card-bezel-inner p-4 space-y-3'>
					<div className='flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between'>
						{/* Search input */}
						<div className='relative flex-1 max-w-md'>
							<Search className='absolute left-3 top-2.5 h-4 w-4 text-slate-400' />
							<input
								type='text'
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder='Search documents by title, team, or content…'
								className='w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all'
							/>
						</div>

						{/* Dropdown Filters */}
						<div className='flex flex-wrap items-center gap-2'>
							{/* Team Filter */}
							<select
								value={selectedTeam}
								onChange={e => setSelectedTeam(e.target.value)}
								className='px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
								<option value='All'>All Teams</option>
								{VALID_TEAMS.map(t => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>

							{/* Type Filter */}
							<select
								value={selectedType}
								onChange={e => setSelectedType(e.target.value)}
								className='px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
								<option value='All'>All Types</option>
								{VALID_DOC_TYPES.map(t => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>

							{/* Language Filter */}
							<select
								value={selectedLanguage}
								onChange={e => setSelectedLanguage(e.target.value)}
								className='px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#0F172A] focus:outline-none focus:border-[#2563EB]'>
								<option value='All'>All Languages</option>
								<option value='English'>English</option>
								<option value='Hindi'>Hindi</option>
								<option value='Malayalam'>Malayalam</option>
								<option value='Tamil'>Tamil</option>
							</select>

							{/* View Switcher */}
							<div className='flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 ml-auto'>
								<button
									onClick={() => setViewMode('list')}
									className={`p-1.5 rounded-md ${
										viewMode === 'list'
											? 'bg-white shadow-xs text-[#0F172A]'
											: 'text-slate-400 hover:text-[#0F172A]'
									}`}
									title='List view'>
									<List className='h-3.5 w-3.5' />
								</button>
								<button
									onClick={() => setViewMode('grid')}
									className={`p-1.5 rounded-md ${
										viewMode === 'grid'
											? 'bg-white shadow-xs text-[#0F172A]'
											: 'text-slate-400 hover:text-[#0F172A]'
									}`}
									title='Grid view'>
									<Grid className='h-3.5 w-3.5' />
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Loading State */}
			{loading && (
				<div className='space-y-3'>
					{[1, 2, 3].map(i => (
						<div
							key={i}
							className='h-28 bg-white border border-slate-200 rounded-xl animate-pulse p-4 flex flex-col justify-between'
						/>
					))}
				</div>
			)}

			{/* Empty State */}
			{!loading && filteredDocs.length === 0 && (
				<DocSetuEmptyState
					title='No documents matched your criteria'
					description='Try adjusting your search query, clearing filters, or adding a new document to the workspace.'
					action={
						<button
							onClick={() => {
								setSelectedTeam('All');
								setSelectedType('All');
								setSelectedLanguage('All');
								setSearchQuery('');
							}}
							className='px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium text-[#0F172A] rounded-lg hover:bg-slate-50 shadow-xs'>
							Reset Filters
						</button>
					}
				/>
			)}

			{/* LIST VIEW */}
			{!loading && filteredDocs.length > 0 && viewMode === 'list' && (
				<div className='space-y-3'>
					{filteredDocs.map(doc => (
						<div
							key={doc.id}
							onClick={() => router.push(`/documents/${doc.id}`)}
							className='card-bezel group cursor-pointer'>
							<div className='card-bezel-inner p-5 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4'>
								{/* Left Content */}
								<div className='space-y-2.5 flex-1 min-w-0'>
									<div className='flex flex-wrap items-center gap-2'>
										<h2 className='text-base font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate'>
											{doc.title}
										</h2>
										<span className='px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold uppercase'>
											{doc.type}
										</span>
										<span className='px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-medium'>
											{doc.team}
										</span>
										<span className='text-xs text-slate-400 font-medium'>
											{doc.language}
										</span>
									</div>

									<p className='text-sm text-slate-600 line-clamp-2 leading-relaxed'>
										{doc.summary || 'Document ingested and available for cross-corpus intelligence.'}
									</p>

									{/* Bottom details row */}
									<div className='flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1'>
										<span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
										<span>•</span>
										<span>{doc.sectionsCount} sections</span>
										<span>•</span>
										<span className='px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-xs'>
											Indexed
										</span>
										<span>•</span>
										<span className='font-mono'>
											{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}
										</span>
										{doc.actions && doc.actions.length > 0 && (
											<>
												<span>•</span>
												<span className='text-amber-700 font-semibold'>
													{doc.actions.length} {doc.actions.length === 1 ? 'action' : 'actions'}
												</span>
											</>
										)}
									</div>
								</div>

								{/* Action Buttons */}
								<div className='flex items-center gap-2 sm:self-center flex-shrink-0' onClick={e => e.stopPropagation()}>
									<button
										onClick={e => openAiForDoc(doc, e)}
										className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[#0F172A] bg-white hover:bg-slate-50 text-xs font-medium transition-colors shadow-2xs'>
										<Sparkles className='h-3.5 w-3.5 text-[#2563EB]' />
										<span>Ask</span>
									</button>

									<Link
										href={`/documents/${doc.id}`}
										className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-[#0F172A] transition-colors shadow-2xs'>
										<Eye className='h-3.5 w-3.5 text-slate-500' />
										<span>View</span>
									</Link>

									<button
										onClick={e => handleDelete(doc.id, e)}
										disabled={deletingId === doc.id}
										className='p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors'
										title='Remove document'>
										<Trash2 className='h-3.5 w-3.5' />
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* GRID VIEW */}
			{!loading && filteredDocs.length > 0 && viewMode === 'grid' && (
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
					{filteredDocs.map(doc => (
						<div
							key={doc.id}
							onClick={() => router.push(`/documents/${doc.id}`)}
							className='card-bezel group cursor-pointer'>
							<div className='card-bezel-inner p-5 transition-all flex flex-col justify-between space-y-4 h-full'>
								<div className='space-y-3'>
									<div className='flex items-center justify-between gap-2'>
										<span className='px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold uppercase'>
											{doc.type}
										</span>
										<span className='text-xs text-slate-400 font-medium'>
											{doc.team}
										</span>
									</div>

									<h2 className='text-base font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors line-clamp-2'>
										{doc.title}
									</h2>

									<p className='text-sm text-slate-600 line-clamp-3 leading-relaxed'>
										{doc.summary}
									</p>
								</div>

								<div className='pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500' onClick={e => e.stopPropagation()}>
									<span>{doc.pageCount} pages • {doc.sectionsCount} sections</span>
									<div className='flex items-center gap-1.5'>
										<button
											onClick={e => openAiForDoc(doc, e)}
											className='p-1.5 text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors'>
											<Sparkles className='h-3.5 w-3.5' />
										</button>
										<button
											onClick={e => handleDelete(doc.id, e)}
											className='p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors'>
											<Trash2 className='h-3.5 w-3.5' />
										</button>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<DocumentIngestModal
				isOpen={isIngestOpen}
				onClose={() => setIsIngestOpen(false)}
				onSuccess={() => void loadData()}
			/>
		</div>
	);
}

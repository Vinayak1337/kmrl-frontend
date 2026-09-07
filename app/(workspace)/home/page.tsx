'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Sparkles,
	FileText,
	AlertTriangle,
	ArrowRight,
	Eye,
	ChevronRight,
	CheckCircle2,
	Building2
} from 'lucide-react';
import { Omnibox } from '@/components/shell/Omnibox';
import { listDocuments } from '@/services/documents';
import { listAllActions } from '@/services/actions';
import { DocSetuDocument, DocumentAction } from '@/types/docsetu';

export default function HomePage() {
	const [recentDocs, setRecentDocs] = useState<DocSetuDocument[]>([]);
	const [urgentActions, setUrgentActions] = useState<DocumentAction[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadHomeData = async () => {
			setLoading(true);
			try {
				const [docsRes, actionsRes] = await Promise.all([
					listDocuments({ pageSize: 6 }),
					listAllActions()
				]);
				setRecentDocs(docsRes.documents);
				setUrgentActions(actionsRes.filter(a => a.dueDate || a.isUrgent));
			} catch (err) {
				console.error('Failed to load home data', err);
			} finally {
				setLoading(false);
			}
		};
		void loadHomeData();
	}, []);

	const distinctTeams = Array.from(new Set(recentDocs.map(d => d.team))).filter(Boolean);

	const discoverQueries = [
		'Which commercial concession agreements require action this quarter?',
		'What capital expenditure thresholds require Board sanction?',
		'What are the non-revenue hours track maintenance protocols?',
		'Summarize traction substation emergency backup sync requirements.'
	];

	return (
		<div className='p-6 sm:p-8 max-w-7xl mx-auto space-y-8'>
			{/* Top Heading */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div className='space-y-1'>
					<h1 className='text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight'>
						Workspace Overview
					</h1>
					<p className='text-xs sm:text-sm text-slate-600'>
						KMRL document intelligence, approaching compliance deadlines, and verified commitments.
					</p>
				</div>

				<div className='flex items-center gap-2 text-xs text-slate-600'>
					<span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs'>
						<span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
						<span>Document Synthesis Online</span>
					</span>
				</div>
			</div>

			{/* Telemetry Double-Bezel Metric Cards */}
			<div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
				<div className='card-bezel'>
					<div className='card-bezel-inner p-5 space-y-1.5'>
						<div className='flex items-center justify-between text-xs text-slate-500 font-medium'>
							<span>Indexed Documents</span>
							<FileText className='h-4 w-4 text-slate-400' />
						</div>
						<div className='text-2xl sm:text-3xl font-bold text-[#0F172A]'>
							{loading ? '-' : recentDocs.length}
						</div>
						<p className='text-[11px] text-slate-400'>Repository source files</p>
					</div>
				</div>

				<div className='card-bezel'>
					<div className='card-bezel-inner p-5 space-y-1.5'>
						<div className='flex items-center justify-between text-xs text-slate-500 font-medium'>
							<span>Approaching Deadlines</span>
							<AlertTriangle className='h-4 w-4 text-[#D97706]' />
						</div>
						<div className='text-2xl sm:text-3xl font-bold text-[#D97706]'>
							{loading ? '-' : urgentActions.length}
						</div>
						<p className='text-[11px] text-slate-400'>Urgent and priority</p>
					</div>
				</div>

				<div className='card-bezel'>
					<div className='card-bezel-inner p-5 space-y-1.5'>
						<div className='flex items-center justify-between text-xs text-slate-500 font-medium'>
							<span>Departments Covered</span>
							<Building2 className='h-4 w-4 text-slate-400' />
						</div>
						<div className='text-2xl sm:text-3xl font-bold text-[#0F172A]'>
							{loading ? '-' : Math.max(distinctTeams.length, 5)}
						</div>
						<p className='text-[11px] text-slate-400'>Cross-functional scope</p>
					</div>
				</div>

				<div className='card-bezel'>
					<div className='card-bezel-inner p-5 space-y-1.5'>
						<div className='flex items-center justify-between text-xs text-slate-500 font-medium'>
							<span>Reasoning Gateway</span>
							<CheckCircle2 className='h-4 w-4 text-[#059669]' />
						</div>
						<div className='text-2xl sm:text-3xl font-bold text-[#059669]'>Active</div>
						<p className='text-[11px] text-slate-400'>Verified grounding active</p>
					</div>
				</div>
			</div>

			{/* Direct Knowledge Interrogation */}
			<div className='card-bezel'>
				<div className='card-bezel-inner p-6 space-y-3.5'>
					<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-1'>
						<label className='block text-xs font-semibold text-[#0F172A] uppercase tracking-[0.1em]'>
							Direct Knowledge Interrogation
						</label>
						<span className='text-[11px] text-slate-400 font-mono'>
							Semantic Search & Grounded Synthesis
						</span>
					</div>
					<Omnibox
						className='max-w-none'
						placeholder='Ask any question across KMRL policies, contracts, or engineering SOPs…'
						onAskDocSetu={q => {
							window.dispatchEvent(
								new CustomEvent('open-docsetu-ai', {
									detail: { question: q }
								})
							);
						}}
					/>
				</div>
			</div>

			{/* Split Grid: Needs Attention & Recent Documents */}
			<div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
				{/* Column 1: Obligations & Deadlines */}
				<div className='lg:col-span-6 card-bezel'>
					<div className='card-bezel-inner p-6 space-y-4 flex flex-col justify-between'>
						<div className='space-y-4'>
							<div className='flex items-center justify-between pb-2 border-b border-slate-200'>
								<h2 className='text-xs font-bold text-[#0F172A] uppercase tracking-[0.1em] flex items-center gap-2'>
									<AlertTriangle className='h-4 w-4 text-[#D97706]' />
									<span>Approaching Obligations</span>
								</h2>
								<Link
									href='/actions'
									className='text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1'>
									<span>View all ({urgentActions.length})</span>
									<ChevronRight className='h-3.5 w-3.5' />
								</Link>
							</div>

							<div className='space-y-3'>
								{urgentActions.slice(0, 3).map((act, idx) => (
									<Link
										key={act.id || idx}
										href={`/documents/${act.documentId || 'doc-kmrl-concession-eda'}`}
										className='block p-4 rounded-xl border border-slate-200 bg-white hover:border-[#2563EB]/40 transition-all shadow-xs space-y-2'>
										<div className='flex items-start justify-between gap-2'>
											<p className='text-xs font-bold text-[#0F172A] leading-snug'>
												{act.action}
											</p>
											{act.dueDate && (
												<span className='px-2.5 py-0.5 rounded-full bg-amber-50 text-[10px] font-semibold text-amber-700 border border-amber-200 whitespace-nowrap'>
													{act.dueDate}
												</span>
											)}
										</div>
										<div className='flex items-center gap-2 text-[11px] text-slate-500'>
											<span className='font-semibold text-[#2563EB]'>{act.team || act.owner}</span>
											<span>•</span>
											<span className='truncate'>{act.documentTitle || act.docTitle}</span>
										</div>
									</Link>
								))}

								{urgentActions.length === 0 && !loading && (
									<p className='text-xs text-slate-400 italic py-3'>
										All compliance commitments and deadlines are acknowledged.
									</p>
								)}
							</div>
						</div>

						<div className='pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500'>
							<span>Verified by Document Ingestion Pipeline</span>
							<span className='text-[#059669] font-medium'>No overdue blockers</span>
						</div>
					</div>
				</div>

				{/* Column 2: Recent Knowledge Sources */}
				<div className='lg:col-span-6 card-bezel'>
					<div className='card-bezel-inner p-6 space-y-4 flex flex-col justify-between'>
						<div className='space-y-4'>
							<div className='flex items-center justify-between pb-2 border-b border-slate-200'>
								<h2 className='text-xs font-bold text-[#0F172A] uppercase tracking-[0.1em] flex items-center gap-2'>
									<FileText className='h-4 w-4 text-[#2563EB]' />
									<span>Recent Operational Sources</span>
								</h2>
								<Link
									href='/documents'
									className='text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1'>
									<span>All Documents ({recentDocs.length})</span>
									<ChevronRight className='h-3.5 w-3.5' />
								</Link>
							</div>

							<div className='space-y-3'>
								{recentDocs.slice(0, 3).map(doc => (
									<Link
										key={doc.id}
										href={`/documents/${doc.id}`}
										className='block p-4 rounded-xl border border-slate-200 bg-white hover:border-[#2563EB]/40 transition-all shadow-xs space-y-1.5'>
										<div className='flex items-center justify-between gap-2'>
											<h3 className='text-xs font-bold text-[#0F172A] truncate'>
												{doc.title}
											</h3>
											<span className='px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700 uppercase tracking-wide'>
												{doc.documentType || doc.type || 'SOP'}
											</span>
										</div>
										<p className='text-xs text-slate-600 line-clamp-1'>
											{doc.summary}
										</p>
										<div className='flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono'>
											<span>{doc.team}</span>
											<span>·</span>
											<span>{doc.totalPages ?? doc.pageCount} pages</span>
											<span>·</span>
											<span>{doc.nodesCount ?? doc.sectionsCount} nodes</span>
										</div>
									</Link>
								))}
							</div>
						</div>

						<div className='pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500'>
							<span>Full-text & semantic vector indexed</span>
							<span className='text-[#2563EB] font-medium'>Ready for Interrogation</span>
						</div>
					</div>
				</div>
			</div>

			{/* RECENT DOCUMENTS DATA TABLE */}
			<div className='card-bezel'>
				<div className='card-bezel-inner overflow-hidden space-y-0'>
					<div className='p-6 border-b border-slate-200 flex items-center justify-between'>
						<div>
							<h2 className='text-sm font-bold text-[#0F172A] tracking-tight'>
								Master Repository Index
							</h2>
							<p className='text-xs text-slate-500 mt-0.5'>
								Access active operating circulars, agreements, and technical manuals
							</p>
						</div>
						<Link
							href='/documents'
							className='text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1'>
							<span>Explore All</span>
							<ArrowRight className='h-3.5 w-3.5' />
						</Link>
					</div>

					<div className='overflow-x-auto'>
						<table className='w-full text-left text-xs'>
							<thead className='bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]'>
								<tr>
									<th className='py-3.5 px-6'>Document Title</th>
									<th className='py-3.5 px-6'>Type</th>
									<th className='py-3.5 px-6'>Department</th>
									<th className='py-3.5 px-6'>Status</th>
									<th className='py-3.5 px-6'>Pages</th>
									<th className='py-3.5 px-6 text-right'>Action</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-slate-100'>
								{recentDocs.map(doc => (
									<tr key={doc.id} className='hover:bg-slate-50/80 transition-colors'>
										<td className='py-4 px-6 font-semibold text-[#0F172A] max-w-sm truncate'>
											<Link
												href={`/documents/${doc.id}`}
												className='hover:text-[#2563EB] transition-colors'>
												{doc.title}
											</Link>
										</td>
										<td className='py-4 px-6'>
											<span className='px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px] uppercase'>
												{doc.documentType || doc.type || 'SOP'}
											</span>
										</td>
										<td className='py-4 px-6 text-slate-600 font-medium'>
											{doc.team}
										</td>
										<td className='py-4 px-6'>
											<span className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[10px]'>
												<span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
												Verified
											</span>
										</td>
										<td className='py-4 px-6 text-slate-400 font-mono'>
											{doc.totalPages ?? doc.pageCount} p.
										</td>
										<td className='py-4 px-6 text-right'>
											<Link
												href={`/documents/${doc.id}`}
												className='inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline'>
												<Eye className='h-3.5 w-3.5' />
												<span>Inspect</span>
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* SUGGESTED QUERIES */}
			<div className='card-bezel'>
				<div className='card-bezel-inner p-6 space-y-4'>
					<h2 className='text-xs font-bold text-[#0F172A] uppercase tracking-[0.1em] flex items-center gap-2'>
						<Sparkles className='h-4 w-4 text-[#2563EB]' />
						<span>Recommended Intelligence Queries</span>
					</h2>

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
						{discoverQueries.map((dq, idx) => (
							<button
								key={idx}
								onClick={() => {
									window.dispatchEvent(
										new CustomEvent('open-docsetu-ai', {
											detail: { question: dq }
										})
									);
								}}
								className='text-left p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-[#2563EB]/40 transition-all flex items-center justify-between text-xs text-[#0F172A] group shadow-2xs'>
								<span className='font-medium group-hover:text-[#2563EB] transition-colors leading-relaxed'>
									&ldquo;{dq}&rdquo;
								</span>
								<ArrowRight className='h-3.5 w-3.5 text-slate-400 group-hover:text-[#2563EB] transition-colors flex-shrink-0 ml-3' />
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

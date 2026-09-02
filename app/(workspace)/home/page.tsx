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
		'What policies and thresholds changed this year?',
		'What vendor contracts require action in the next 30 days?',
		'Which documents have pending sign-offs or compliance obligations?',
		'Summarize cross-department responsibilities for procurement rollout.'
	];

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-8'>
			{/* Header */}
			<div className='space-y-1'>
				<h1 className='text-2xl md:text-3xl font-bold text-[#172033] tracking-tight'>
					Workspace Overview
				</h1>
				<p className='text-sm text-[#677080]'>
					Track approaching deadlines, review recent uploads, and search organizational documents.
				</p>
			</div>

			{/* Telemetry Metric Cards */}
			<div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
				<div className='bg-white p-4 rounded-xl border border-[#E1E4DF] shadow-2xs space-y-1'>
					<div className='flex items-center justify-between text-xs text-[#677080] font-medium'>
						<span>Total Documents</span>
						<FileText className='h-4 w-4 text-[#4656D9]' />
					</div>
					<div className='text-2xl font-bold text-[#172033]'>
						{loading ? '—' : recentDocs.length}
					</div>
					<p className='text-xs text-[#9098A5]'>Indexed across repository</p>
				</div>

				<div className='bg-white p-4 rounded-xl border border-[#E1E4DF] shadow-2xs space-y-1'>
					<div className='flex items-center justify-between text-xs text-[#677080] font-medium'>
						<span>Needs Attention</span>
						<AlertTriangle className='h-4 w-4 text-[#C77B1B]' />
					</div>
					<div className='text-2xl font-bold text-[#C77B1B]'>
						{loading ? '—' : urgentActions.length}
					</div>
					<p className='text-xs text-[#9098A5]'>Deadlines & high-priority</p>
				</div>

				<div className='bg-white p-4 rounded-xl border border-[#E1E4DF] shadow-2xs space-y-1'>
					<div className='flex items-center justify-between text-xs text-[#677080] font-medium'>
						<span>Departments</span>
						<Building2 className='h-4 w-4 text-[#179C8C]' />
					</div>
					<div className='text-2xl font-bold text-[#172033]'>
						{loading ? '—' : Math.max(distinctTeams.length, 1)}
					</div>
					<p className='text-xs text-[#9098A5]'>Cross-functional scope</p>
				</div>

				<div className='bg-white p-4 rounded-xl border border-[#E1E4DF] shadow-2xs space-y-1'>
					<div className='flex items-center justify-between text-xs text-[#677080] font-medium'>
						<span>Corpus Status</span>
						<CheckCircle2 className='h-4 w-4 text-[#39825E]' />
					</div>
					<div className='text-2xl font-bold text-[#39825E]'>Active</div>
					<p className='text-xs text-[#9098A5]'>Zero indexing backlog</p>
				</div>
			</div>

			{/* Direct Knowledge Search */}
			<div className='bg-white rounded-2xl border border-[#E1E4DF] p-6 shadow-xs space-y-3'>
				<div className='flex items-center justify-between'>
					<label className='block text-xs font-semibold text-[#172033] uppercase tracking-wider'>
						Direct Knowledge Access
					</label>
					<span className='text-xs text-[#9098A5]'>Search or ask natural language questions</span>
				</div>
				<Omnibox
					className='max-w-none'
					placeholder='Ask anything across your organization&rsquo;s documents…'
					onAskDocSetu={q => {
						window.dispatchEvent(
							new CustomEvent('open-docsetu-ai', {
								detail: { question: q }
							})
						);
					}}
				/>
			</div>

			{/* Attention & Recent Knowledge Split Grid */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
				{/* Column 1: Needs Attention */}
				<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4 flex flex-col justify-between'>
					<div className='space-y-3'>
						<div className='flex items-center justify-between'>
							<h2 className='text-xs font-semibold text-[#172033] uppercase tracking-wider flex items-center gap-2'>
								<AlertTriangle className='h-4 w-4 text-[#C77B1B]' />
								<span>Needs Attention</span>
							</h2>
							<Link
								href='/actions'
								className='text-xs text-[#4656D9] font-medium hover:underline flex items-center gap-1'>
								<span>View all</span>
								<ChevronRight className='h-3.5 w-3.5' />
							</Link>
						</div>

						<div className='space-y-2.5'>
							{urgentActions.slice(0, 3).map((act, idx) => (
								<Link
									key={act.id || idx}
									href={`/documents/${act.documentId}`}
									className='block p-3.5 rounded-lg border border-[#E1E4DF] bg-[#F6F7F4]/60 hover:bg-[#F1F3F1] transition-colors'>
									<div className='flex items-start justify-between gap-2'>
										<p className='text-sm font-semibold text-[#172033] leading-snug line-clamp-1'>
											{act.action}
										</p>
										{act.dueDate && (
											<span className='px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 whitespace-nowrap'>
												{act.dueDate}
											</span>
										)}
									</div>
									<div className='flex items-center gap-2 text-xs text-[#677080] mt-1.5'>
										<span className='font-semibold text-[#172033]'>{act.team}</span>
										<span>•</span>
										<span className='truncate'>{act.documentTitle}</span>
									</div>
								</Link>
							))}

							{urgentActions.length === 0 && !loading && (
								<p className='text-xs text-[#9098A5] italic py-3'>
									All actions and deadlines are currently acknowledged.
								</p>
							)}
						</div>
					</div>

					<div className='pt-3 border-t border-[#E1E4DF] flex items-center justify-between text-xs text-[#677080]'>
						<span>{urgentActions.length} deadlines requiring review</span>
						<span className='text-[#39825E] font-medium'>No blockers</span>
					</div>
				</div>

				{/* Column 2: Recent Knowledge */}
				<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4 flex flex-col justify-between'>
					<div className='space-y-3'>
						<div className='flex items-center justify-between'>
							<h2 className='text-xs font-semibold text-[#172033] uppercase tracking-wider flex items-center gap-2'>
								<FileText className='h-4 w-4 text-[#4656D9]' />
								<span>Recent Knowledge</span>
							</h2>
							<Link
								href='/documents'
								className='text-xs text-[#4656D9] font-medium hover:underline flex items-center gap-1'>
								<span>View all</span>
								<ChevronRight className='h-3.5 w-3.5' />
							</Link>
						</div>

						<div className='space-y-2.5'>
							{recentDocs.slice(0, 3).map(doc => (
								<Link
									key={doc.id}
									href={`/documents/${doc.id}`}
									className='block p-3.5 rounded-lg border border-[#E1E4DF] bg-white hover:bg-[#F6F7F4] transition-colors'>
									<div className='flex items-center justify-between gap-2'>
										<h3 className='text-sm font-semibold text-[#172033] truncate'>
											{doc.title}
										</h3>
										<span className='px-2 py-0.5 rounded bg-[#4656D9]/10 text-xs font-semibold text-[#4656D9] whitespace-nowrap'>
											{doc.type}
										</span>
									</div>
									<p className='text-xs text-[#677080] line-clamp-1 mt-1'>
										{doc.summary}
									</p>
								</Link>
							))}
						</div>
					</div>

					<div className='pt-3 border-t border-[#E1E4DF] flex items-center justify-between text-xs text-[#677080]'>
						<span>{recentDocs.length} documents indexed</span>
						<span className='text-[#4656D9] font-medium'>Structured & Searchable</span>
					</div>
				</div>
			</div>

			{/* RECENT DOCUMENTS TABLE */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] shadow-2xs overflow-hidden space-y-0'>
				<div className='p-5 border-b border-[#E1E4DF] flex items-center justify-between'>
					<div>
						<h2 className='text-base font-semibold text-[#172033]'>
							Recent Documents
						</h2>
						<p className='text-xs text-[#677080] mt-0.5'>
							Access the latest uploads with direct jump links and status
						</p>
					</div>
					<Link
						href='/documents'
						className='text-xs font-medium text-[#4656D9] hover:underline flex items-center gap-1'>
						<span>Explore repository</span>
						<ArrowRight className='h-3.5 w-3.5' />
					</Link>
				</div>

				<div className='overflow-x-auto'>
					<table className='w-full text-left text-xs'>
						<thead className='bg-[#F6F7F4] border-b border-[#E1E4DF] text-[#677080] uppercase tracking-wider font-semibold text-xs'>
							<tr>
								<th className='py-3 px-5'>Document</th>
								<th className='py-3 px-5'>Type</th>
								<th className='py-3 px-5'>Team</th>
								<th className='py-3 px-5'>Status</th>
								<th className='py-3 px-5'>Uploaded</th>
								<th className='py-3 px-5 text-right'>Action</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-[#E1E4DF]'>
							{recentDocs.map(doc => (
								<tr key={doc.id} className='hover:bg-[#F6F7F4]/50 transition-colors'>
									<td className='py-3.5 px-5 font-semibold text-[#172033] max-w-xs truncate'>
										<Link
											href={`/documents/${doc.id}`}
											className='hover:text-[#4656D9] transition-colors'>
											{doc.title}
										</Link>
									</td>
									<td className='py-3.5 px-5'>
										<span className='px-2 py-0.5 rounded bg-[#4656D9]/10 text-[#4656D9] font-semibold text-xs'>
											{doc.type}
										</span>
									</td>
									<td className='py-3.5 px-5 text-[#677080] font-medium'>
										{doc.team}
									</td>
									<td className='py-3.5 px-5'>
										<span className='inline-flex items-center px-2 py-0.5 rounded bg-[#39825E]/10 border border-[#39825E]/20 text-[#39825E] font-semibold text-xs'>
											Indexed
										</span>
									</td>
									<td className='py-3.5 px-5 text-[#9098A5]'>
										{new Date(doc.uploadedAt).toLocaleDateString()}
									</td>
									<td className='py-3.5 px-5 text-right'>
										<Link
											href={`/documents/${doc.id}`}
											className='inline-flex items-center gap-1 text-xs font-medium text-[#4656D9] hover:underline'>
											<Eye className='h-3.5 w-3.5' />
											<span>View</span>
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* DISCOVER PROMPT SECTION */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4'>
				<h2 className='text-xs font-semibold text-[#172033] uppercase tracking-wider flex items-center gap-2'>
					<Sparkles className='h-4 w-4 text-[#4656D9]' />
					<span>Suggested Queries</span>
				</h2>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
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
							className='text-left p-3 rounded-lg border border-[#E1E4DF] bg-[#F6F7F4]/40 hover:bg-[#F6F7F4] hover:border-[#4656D9] transition-all flex items-center justify-between text-xs text-[#172033] group'>
							<span className='font-medium group-hover:text-[#4656D9] transition-colors'>
								{dq}
							</span>
							<ArrowRight className='h-3.5 w-3.5 text-[#9098A5] group-hover:text-[#4656D9] transition-colors flex-shrink-0 ml-2' />
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

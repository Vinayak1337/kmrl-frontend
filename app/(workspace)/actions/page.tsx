'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	CheckSquare,
	Clock,
	FileText,
	ArrowUpRight,
	AlertCircle
} from 'lucide-react';
import { DocumentAction } from '@/types/docsetu';
import { listAllActions } from '@/services/actions';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

type ActionFilter = 'all' | 'due_soon' | 'overdue' | 'no_date';

export default function ActionsPage() {
	const [actions, setActions] = useState<DocumentAction[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeFilter, setActiveFilter] = useState<ActionFilter>('all');
	const [selectedTeam, setSelectedTeam] = useState('All');

	useEffect(() => {
		const loadActions = async () => {
			setLoading(true);
			try {
				const res = await listAllActions();
				setActions(res);
			} catch (err) {
				console.error('Failed to load actions', err);
			} finally {
				setLoading(false);
			}
		};
		void loadActions();
	}, []);

	// Filter logic
	const filteredActions = actions.filter(act => {
		if (selectedTeam !== 'All' && act.team !== selectedTeam) return false;

		if (activeFilter === 'due_soon') {
			return !!act.dueDate;
		}
		if (activeFilter === 'overdue') {
			// Mock check or past date check
			return act.isUrgent && !!act.dueDate;
		}
		if (activeFilter === 'no_date') {
			return !act.dueDate;
		}
		return true;
	});

	const teams = Array.from(new Set(actions.map(a => a.team))).filter(Boolean);

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
						<CheckSquare className='h-6 w-6 text-[#4656D9]' />
						<span>Actions & Deadlines</span>
					</h1>
					<p className='text-xs text-[#677080] mt-0.5'>
						Deadlines, approvals, risks, and extracted responsibilities surfaced across documents.
					</p>
				</div>

				<div className='flex items-center gap-2'>
					<select
						value={selectedTeam}
						onChange={e => setSelectedTeam(e.target.value)}
						className='px-3 py-2 text-xs bg-white border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9] shadow-2xs'>
						<option value='All'>All Teams</option>
						{teams.map(t => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className='flex border-b border-[#E1E4DF] gap-4 text-xs font-medium'>
				{(
					[
						{ id: 'all', label: 'All Actions' },
						{ id: 'due_soon', label: 'Due Soon' },
						{ id: 'overdue', label: 'Urgent & High Priority' },
						{ id: 'no_date', label: 'No Due Date' }
					] as const
				).map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveFilter(tab.id)}
						className={`pb-3 capitalize transition-colors ${
							activeFilter === tab.id
								? 'border-b-2 border-[#4656D9] text-[#4656D9] font-semibold'
								: 'text-[#677080] hover:text-[#172033]'
						}`}>
						{tab.label}
					</button>
				))}
			</div>

			{/* Loading State */}
			{loading && (
				<div className='space-y-3'>
					{[1, 2, 3, 4].map(i => (
						<div
							key={i}
							className='h-20 bg-white rounded-xl border border-[#E1E4DF] animate-pulse'
						/>
					))}
				</div>
			)}

			{/* Empty State */}
			{!loading && filteredActions.length === 0 && (
				<DocSetuEmptyState
					title='No actions found'
					description='No actionable items match the selected filter criteria across your indexed documents.'
				/>
			)}

			{/* Actions Table / Feed */}
			{!loading && filteredActions.length > 0 && (
				<div className='bg-white rounded-xl border border-[#E1E4DF] overflow-hidden shadow-2xs'>
					<div className='divide-y divide-[#E1E4DF]'>
						{filteredActions.map(act => (
							<div
								key={act.id}
								className='p-5 hover:bg-[#F6F7F4]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
								{/* Left: Action description and source */}
								<div className='space-y-1.5 flex-1 min-w-0'>
									<div className='flex items-start gap-2.5'>
										{act.isUrgent ? (
											<AlertCircle className='h-4 w-4 text-[#C63D3D] flex-shrink-0 mt-0.5' />
										) : (
											<CheckSquare className='h-4 w-4 text-[#4656D9] flex-shrink-0 mt-0.5' />
										)}
										<p className='text-xs font-semibold text-[#172033] leading-snug'>
											{act.action}
										</p>
									</div>

									<div className='flex flex-wrap items-center gap-2.5 text-[11px] text-[#677080] pl-6'>
										<Link
											href={`/documents/${act.documentId}`}
											className='font-medium text-[#4656D9] hover:underline flex items-center gap-1'>
											<FileText className='h-3 w-3 text-[#9098A5]' />
											<span className='truncate max-w-[280px]'>{act.documentTitle}</span>
											<ArrowUpRight className='h-3 w-3' />
										</Link>

										{act.sectionTitle && (
											<>
												<span>/</span>
												<span className='text-[#9098A5]'>{act.sectionTitle}</span>
											</>
										)}
									</div>
								</div>

								{/* Right: Team and Due Date */}
								<div className='flex items-center gap-3 pl-4 sm:pl-0 flex-shrink-0'>
									<span className='px-2.5 py-1 rounded-md bg-[#F1F3F1] text-xs font-medium text-[#172033]'>
										{act.team}
									</span>

									{act.dueDate ? (
										<div className='flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 whitespace-nowrap'>
											<Clock className='h-3.5 w-3.5 text-amber-600' />
											<span>Due {act.dueDate}</span>
										</div>
									) : (
										<span className='text-xs text-[#9098A5] italic whitespace-nowrap'>
											No deadline
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

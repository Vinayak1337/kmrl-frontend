'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	CheckSquare,
	Clock,
	FileText,
	ArrowUpRight,
	Copy,
	Check
} from 'lucide-react';
import { DocumentAction } from '@/types/docsetu';
import { listAllActions } from '@/services/actions';
import { DocSetuEmptyState } from '@/components/brand/DocSetuBrand';

type ActionFilter = 'all' | 'due_soon' | 'in_progress' | 'completed';
type ActionStatus = 'pending' | 'in_progress' | 'completed';

export default function ActionsPage() {
	const [actions, setActions] = useState<DocumentAction[]>([]);
	const [statusMap, setStatusMap] = useState<Record<string, ActionStatus>>({});
	const [loading, setLoading] = useState(true);
	const [activeFilter, setActiveFilter] = useState<ActionFilter>('all');
	const [selectedTeam, setSelectedTeam] = useState('All');
	const [copiedId, setCopiedId] = useState<string | null>(null);

	useEffect(() => {
		const loadActions = async () => {
			setLoading(true);
			try {
				const res = await listAllActions();
				setActions(res);
				const saved = localStorage.getItem('docsetu_action_statuses');
				if (saved) {
					try {
						setStatusMap(JSON.parse(saved));
					} catch {
						// ignore
					}
				}
			} catch (err) {
				console.error('Failed to load actions', err);
			} finally {
				setLoading(false);
			}
		};
		void loadActions();
	}, []);

	const handleStatusChange = (id: string, newStatus: ActionStatus) => {
		setStatusMap(prev => {
			const updated = { ...prev, [id]: newStatus };
			try {
				localStorage.setItem('docsetu_action_statuses', JSON.stringify(updated));
			} catch {
				// ignore
			}
			return updated;
		});
	};

	const handleCopyCitation = (act: DocumentAction) => {
		const text = `Action: ${act.action}\nDocument: ${act.documentTitle}${act.sectionTitle ? ` (${act.sectionTitle})` : ''}\nTeam: ${act.team}${act.dueDate ? ` | Due: ${act.dueDate}` : ''}`;
		navigator.clipboard.writeText(text);
		setCopiedId(act.id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	// Filter logic
	const filteredActions = actions.filter(act => {
		if (selectedTeam !== 'All' && act.team !== selectedTeam) return false;
		const currentStatus = statusMap[act.id] || 'pending';

		if (activeFilter === 'due_soon') {
			return !!act.dueDate && currentStatus !== 'completed';
		}
		if (activeFilter === 'in_progress') {
			return currentStatus === 'in_progress';
		}
		if (activeFilter === 'completed') {
			return currentStatus === 'completed';
		}
		return true;
	});

	const teams = Array.from(new Set(actions.map(a => a.team))).filter(Boolean);

	const countDueSoon = actions.filter(a => !!a.dueDate && (statusMap[a.id] || 'pending') !== 'completed').length;
	const countInProgress = actions.filter(a => statusMap[a.id] === 'in_progress').length;
	const countCompleted = actions.filter(a => statusMap[a.id] === 'completed').length;

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
						<CheckSquare className='h-6 w-6 text-[#4656D9]' />
						<span>Actions & Obligations</span>
					</h1>
					<p className='text-sm text-[#677080] mt-0.5'>
						Operational deadlines, approvals, and compliance requirements extracted from your documents.
					</p>
				</div>

				<div className='flex items-center gap-3'>
					<select
						value={selectedTeam}
						onChange={e => setSelectedTeam(e.target.value)}
						className='px-3.5 py-2 text-xs font-semibold bg-white border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9] shadow-2xs'>
						<option value='All'>All Departments</option>
						{teams.map(t => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Filter Tabs */}
			<div className='flex border-b border-[#E1E4DF] gap-6 text-xs font-semibold'>
				{[
					{ id: 'all', label: 'All Obligations', count: actions.length },
					{ id: 'due_soon', label: 'Due Soon', count: countDueSoon },
					{ id: 'in_progress', label: 'In Progress', count: countInProgress },
					{ id: 'completed', label: 'Completed', count: countCompleted }
				].map(tab => (
					<button
						key={tab.id}
						onClick={() => setActiveFilter(tab.id as ActionFilter)}
						className={`pb-3 flex items-center gap-2 transition-colors cursor-pointer ${
							activeFilter === tab.id
								? 'border-b-2 border-[#4656D9] text-[#4656D9] font-bold'
								: 'text-[#677080] hover:text-[#172033]'
						}`}>
						<span>{tab.label}</span>
						<span
							className={`px-2 py-0.5 rounded-full text-xs ${
								activeFilter === tab.id
									? 'bg-[#4656D9]/10 text-[#4656D9]'
									: 'bg-[#F1F3F1] text-[#677080]'
							}`}>
							{tab.count}
						</span>
					</button>
				))}
			</div>

			{/* Loading State */}
			{loading && (
				<div className='space-y-3'>
					{[1, 2, 3, 4].map(i => (
						<div
							key={i}
							className='h-24 bg-white rounded-xl border border-[#E1E4DF] animate-pulse'
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

			{/* Actions Feed */}
			{!loading && filteredActions.length > 0 && (
				<div className='bg-white rounded-xl border border-[#E1E4DF] overflow-hidden shadow-2xs'>
					<div className='divide-y divide-[#E1E4DF]'>
						{filteredActions.map(act => {
							const currentStatus = statusMap[act.id] || 'pending';
							return (
								<div
									key={act.id}
									className={`p-5 hover:bg-[#F6F7F4]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
										currentStatus === 'completed' ? 'bg-[#F6F7F4]/30 opacity-75' : ''
									}`}>
									{/* Left: Action description and source */}
									<div className='space-y-2 flex-1 min-w-0'>
										<div className='flex items-start gap-3'>
											<button
												onClick={() =>
													handleStatusChange(
														act.id,
														currentStatus === 'completed' ? 'pending' : 'completed'
													)
												}
												className={`mt-0.5 h-5 w-5 rounded-md flex items-center justify-center transition-colors border ${
													currentStatus === 'completed'
														? 'bg-[#39825E] border-[#39825E] text-white'
														: 'border-[#E1E4DF] bg-white text-transparent hover:border-[#4656D9]'
												}`}
												title='Toggle Completed'>
												<Check className='h-3.5 w-3.5 stroke-[3]' />
											</button>

											<p
												className={`text-sm font-semibold leading-snug ${
													currentStatus === 'completed'
														? 'line-through text-[#677080]'
														: 'text-[#172033]'
												}`}>
												{act.action}
											</p>
										</div>

										<div className='flex flex-wrap items-center gap-3 text-xs text-[#677080] pl-8'>
											<Link
												href={`/documents/${act.documentId}`}
												className='font-semibold text-[#4656D9] hover:underline flex items-center gap-1'>
												<FileText className='h-3.5 w-3.5 text-[#9098A5]' />
												<span className='truncate max-w-[280px]'>{act.documentTitle}</span>
												<ArrowUpRight className='h-3 w-3' />
											</Link>

											{act.sectionTitle && (
												<>
													<span>•</span>
													<span className='text-[#9098A5]'>{act.sectionTitle}</span>
												</>
											)}

											<span>•</span>
											<span className='px-2 py-0.5 rounded bg-[#F1F3F1] font-semibold text-[#172033]'>
												{act.team}
											</span>
										</div>
									</div>

									{/* Right: Due Date and Actions */}
									<div className='flex items-center gap-3 pl-8 sm:pl-0 flex-shrink-0'>
										{/* Status Pill Select */}
										<select
											value={currentStatus}
											onChange={e =>
												handleStatusChange(act.id, e.target.value as ActionStatus)
											}
											className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${
												currentStatus === 'completed'
													? 'bg-[#39825E]/10 border-[#39825E]/30 text-[#39825E]'
													: currentStatus === 'in_progress'
													? 'bg-[#4656D9]/10 border-[#4656D9]/30 text-[#4656D9]'
													: 'bg-white border-[#E1E4DF] text-[#677080]'
											}`}>
											<option value='pending'>Pending</option>
											<option value='in_progress'>In Progress</option>
											<option value='completed'>Completed</option>
										</select>

										{/* Due Date */}
										{act.dueDate ? (
											<div className='flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 whitespace-nowrap'>
												<Clock className='h-3.5 w-3.5 text-amber-600' />
												<span>Due {act.dueDate}</span>
											</div>
										) : (
											<span className='text-xs text-[#9098A5] italic whitespace-nowrap'>
												No date
											</span>
										)}

										{/* Copy Citation */}
										<button
											onClick={() => handleCopyCitation(act)}
											className='p-1.5 text-[#9098A5] hover:text-[#172033] hover:bg-[#F6F7F4] rounded-md transition-colors'
											title='Copy citation'>
											{copiedId === act.id ? (
												<Check className='h-4 w-4 text-[#39825E]' />
											) : (
												<Copy className='h-4 w-4' />
											)}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

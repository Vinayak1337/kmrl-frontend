'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Search } from 'lucide-react';
import { AuditEntry } from '@/types/docsetu';
import { listAuditEntries } from '@/services/audit';

export default function AuditPage() {
	const [entries, setEntries] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedAction, setSelectedAction] = useState('All');

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const res = await listAuditEntries();
				setEntries(res.entries);
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, []);

	const filteredEntries = entries.filter(e => {
		if (selectedAction !== 'All' && !e.action.toLowerCase().includes(selectedAction.toLowerCase())) {
			return false;
		}
		if (
			searchQuery &&
			!e.actorName.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!e.actorEmail.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!e.target.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!e.action.toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false;
		}
		return true;
	});

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div>
				<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
					<Clock className='h-6 w-6 text-[#4656D9]' />
					<span>Audit & Traceability</span>
				</h1>
				<p className='text-xs text-[#677080] mt-0.5'>
					Immutable activity log of document ingestions, access policy modifications, and governance events.
				</p>
			</div>

			{/* Filters */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] p-3 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between'>
				<div className='relative flex-1 max-w-md w-full'>
					<Search className='absolute left-3 top-2.5 h-4 w-4 text-[#9098A5]' />
					<input
						type='text'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder='Search by actor, target, or action…'
						className='w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9]'
					/>
				</div>

				<select
					value={selectedAction}
					onChange={e => setSelectedAction(e.target.value)}
					className='px-3 py-2 text-xs bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9] w-full sm:w-auto'>
					<option value='All'>All Activities</option>
					<option value='Ingested'>Document Ingestions</option>
					<option value='policy'>Access Policy Changes</option>
					<option value='member'>User Provisioning</option>
					<option value='Exported'>Document Downloads</option>
					<option value='translation'>Translations</option>
				</select>
			</div>

			{/* Audit Table */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] shadow-2xs overflow-hidden'>
				<table className='w-full text-left text-xs'>
					<thead className='bg-[#F6F7F4] border-b border-[#E1E4DF] text-[#677080] uppercase tracking-wider font-semibold text-[10px]'>
						<tr>
							<th className='py-3.5 px-6'>Timestamp</th>
							<th className='py-3.5 px-6'>Action</th>
							<th className='py-3.5 px-6'>Actor</th>
							<th className='py-3.5 px-6'>Target Object</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-[#E1E4DF]'>
						{loading ? (
							<tr>
								<td colSpan={4} className='py-8 text-center text-[#9098A5]'>
									Loading audit trail…
								</td>
							</tr>
						) : filteredEntries.length === 0 ? (
							<tr>
								<td colSpan={4} className='py-8 text-center text-[#9098A5]'>
									No matching audit entries.
								</td>
							</tr>
						) : (
							filteredEntries.map(entry => (
								<tr key={entry.id} className='hover:bg-[#F6F7F4]/50 transition-colors'>
									<td className='py-4 px-6 text-[#677080] whitespace-nowrap font-mono text-[11px]'>
										{new Date(entry.timestamp).toLocaleString()}
									</td>

									<td className='py-4 px-6 font-semibold text-[#172033]'>
										{entry.action}
									</td>

									<td className='py-4 px-6'>
										<div className='flex items-center gap-2'>
											<div className='w-6 h-6 rounded-full bg-[#F1F3F1] text-[#4656D9] flex items-center justify-center font-semibold text-[10px]'>
												{entry.actorName.charAt(0).toUpperCase()}
											</div>
											<div>
												<p className='font-medium text-[#172033]'>{entry.actorName}</p>
												{entry.actorEmail && (
													<p className='text-[10px] text-[#9098A5]'>
														{entry.actorEmail}
													</p>
												)}
											</div>
										</div>
									</td>

									<td className='py-4 px-6 text-[#677080] max-w-sm truncate'>
										{entry.target}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

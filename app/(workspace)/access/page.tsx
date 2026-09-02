'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Check, Lock, Info } from 'lucide-react';
import { AccessPolicy } from '@/types/docsetu';
import { getAccessPolicies } from '@/services/access';

export default function AccessPage() {
	const [policies, setPolicies] = useState<AccessPolicy[]>([]);

	useEffect(() => {
		const load = async () => {
			const res = await getAccessPolicies();
			setPolicies(res);
		};
		void load();
	}, []);

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div>
				<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
					<Shield className='h-6 w-6 text-[#4656D9]' />
					<span>Access Policies</span>
				</h1>
				<p className='text-xs text-[#677080] mt-0.5'>
					Role and team-based retrieval boundaries. Users only query and retrieve documents their team is authorized to see.
				</p>
			</div>

			{/* Info Banner */}
			<div className='p-4 bg-white rounded-xl border border-[#E1E4DF] flex items-start gap-3 shadow-2xs'>
				<Info className='h-4 w-4 text-[#4656D9] mt-0.5 flex-shrink-0' />
				<div className='text-xs text-[#677080] leading-relaxed'>
					<span className='font-semibold text-[#172033]'>
						Source-level boundary enforcement:{' '}
					</span>
					When team members ask questions or run natural-language searches in DocSetu, answers and citations are filtered dynamically by these policy boundaries before LLM synthesis.
				</div>
			</div>

			{/* Policy Cards Matrix */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{policies.map(pol => (
					<div
						key={pol.documentType}
						className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-4 flex flex-col justify-between'>
						<div className='space-y-2'>
							<div className='flex items-center justify-between'>
								<span className='px-2.5 py-0.5 rounded-md bg-[#4656D9]/10 text-[#4656D9] text-xs font-semibold'>
									{pol.documentType}
								</span>
								{pol.adminOnly && (
									<span className='inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded'>
										<Lock className='h-3 w-3' />
										<span>Admin Restricted</span>
									</span>
								)}
							</div>

							<p className='text-xs text-[#677080] leading-relaxed'>
								{pol.description}
							</p>
						</div>

						<div className='space-y-3 pt-3 border-t border-[#E1E4DF] text-xs'>
							<div className='space-y-1.5'>
								<span className='text-[11px] font-semibold text-[#9098A5] uppercase tracking-wider'>
									Visible To Teams
								</span>
								<div className='flex flex-wrap gap-1.5'>
									{pol.visibleToTeams.map(t => (
										<span
											key={t}
											className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F6F7F4] border border-[#E1E4DF] text-[#172033] font-medium'>
											<Check className='h-3 w-3 text-[#179C8C]' />
											<span>{t}</span>
										</span>
									))}
								</div>
							</div>

							{pol.canEditTeams && (
								<div className='space-y-1'>
									<span className='text-[11px] font-semibold text-[#9098A5] uppercase tracking-wider'>
										Authorized Publishers
									</span>
									<div className='flex flex-wrap gap-1.5 text-[11px] text-[#677080]'>
										{pol.canEditTeams.join(', ')}
									</div>
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

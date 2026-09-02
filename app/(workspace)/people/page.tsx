'use client';

import React, { useState, useEffect } from 'react';
import {
	Users,
	Plus,
	Search,
	X,
	Check,
	Loader2,
	AlertCircle
} from 'lucide-react';
import { Person } from '@/types/docsetu';
import { listPeople, createPerson } from '@/services/people';
import { VALID_TEAMS } from '@/adapters/documentAdapter';

export default function PeoplePage() {
	const [people, setPeople] = useState<Person[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [isCreateOpen, setIsCreateOpen] = useState(false);

	// New Person Form State
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [team, setTeam] = useState('Legal');
	const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadPeople = async () => {
		setLoading(true);
		try {
			const res = await listPeople();
			setPeople(res);
		} catch (err) {
			console.error('Failed to load team members', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadPeople();
	}, []);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !email.trim()) {
			setError('Name and valid email are required.');
			return;
		}

		setError(null);
		setSubmitting(true);
		try {
			await createPerson({
				name,
				email,
				password: password || undefined,
				team,
				role
			});
			setIsCreateOpen(false);
			setName('');
			setEmail('');
			setPassword('');
			await loadPeople();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to add team member';
			setError(msg);
		} finally {
			setSubmitting(false);
		}
	};

	const filteredPeople = people.filter(
		p =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.team.toLowerCase().includes(searchQuery.toLowerCase())
	);

	return (
		<div className='p-6 md:p-8 max-w-7xl mx-auto space-y-6'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
				<div>
					<h1 className='text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5'>
						<Users className='h-6 w-6 text-[#4656D9]' />
						<span>People</span>
					</h1>
					<p className='text-xs text-[#677080] mt-0.5'>
						Manage organization team members, roles, and document access privileges.
					</p>
				</div>

				<button
					onClick={() => setIsCreateOpen(true)}
					className='inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4656D9] text-white hover:bg-[#3B4BBF] text-xs font-medium transition-colors shadow-2xs w-fit'>
					<Plus className='h-4 w-4' />
					<span>Add Team Member</span>
				</button>
			</div>

			{/* Search Filter */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] p-3 shadow-2xs'>
				<div className='relative max-w-md'>
					<Search className='absolute left-3 top-2.5 h-4 w-4 text-[#9098A5]' />
					<input
						type='text'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder='Filter by name, email, or team…'
						className='w-full pl-9 pr-3 py-2 text-xs bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9]'
					/>
				</div>
			</div>

			{/* People Table */}
			<div className='bg-white rounded-xl border border-[#E1E4DF] shadow-2xs overflow-hidden'>
				<table className='w-full text-left text-xs'>
					<thead className='bg-[#F6F7F4] border-b border-[#E1E4DF] text-[#677080] uppercase tracking-wider font-semibold text-[10px]'>
						<tr>
							<th className='py-3.5 px-6'>Name</th>
							<th className='py-3.5 px-6'>Team</th>
							<th className='py-3.5 px-6'>Role</th>
							<th className='py-3.5 px-6'>Access Scope</th>
							<th className='py-3.5 px-6 text-right'>Member Since</th>
						</tr>
					</thead>
					<tbody className='divide-y divide-[#E1E4DF]'>
						{loading ? (
							<tr>
								<td colSpan={5} className='py-8 text-center text-[#9098A5]'>
									Loading team members…
								</td>
							</tr>
						) : filteredPeople.length === 0 ? (
							<tr>
								<td colSpan={5} className='py-8 text-center text-[#9098A5]'>
									No team members found.
								</td>
							</tr>
						) : (
							filteredPeople.map(person => (
								<tr key={person.id} className='hover:bg-[#F6F7F4]/50 transition-colors'>
									<td className='py-4 px-6'>
										<div className='flex items-center gap-3'>
											<div className='w-8 h-8 rounded-full bg-[#172033] text-white flex items-center justify-center font-semibold text-xs flex-shrink-0'>
												{person.name.charAt(0).toUpperCase()}
											</div>
											<div>
												<p className='font-semibold text-[#172033]'>{person.name}</p>
												<p className='text-[11px] text-[#9098A5]'>{person.email}</p>
											</div>
										</div>
									</td>

									<td className='py-4 px-6 font-medium text-[#172033]'>
										{person.team}
									</td>

									<td className='py-4 px-6'>
										<span
											className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
												person.role === 'ADMIN'
													? 'bg-red-50 text-red-700 border border-red-200'
													: person.role === 'MANAGER'
													? 'bg-[#4656D9]/10 text-[#4656D9]'
													: 'bg-[#F1F3F1] text-[#677080]'
											}`}>
											{person.role}
										</span>
									</td>

									<td className='py-4 px-6 text-[#677080] font-medium'>
										{person.accessSummary}
									</td>

									<td className='py-4 px-6 text-right text-[#9098A5]'>
										{person.createdAt
											? new Date(person.createdAt).toLocaleDateString()
											: 'Recent'}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{/* Create Member Modal */}
			{isCreateOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs'>
					<div className='bg-white rounded-2xl max-w-md w-full p-6 border border-[#E1E4DF] shadow-2xl space-y-4'>
						<div className='flex items-center justify-between border-b border-[#E1E4DF] pb-3'>
							<h3 className='text-sm font-semibold text-[#172033]'>
								Add Team Member
							</h3>
							<button
								onClick={() => setIsCreateOpen(false)}
								className='p-1 text-[#9098A5] hover:text-[#172033]'>
								<X className='h-4 w-4' />
							</button>
						</div>

						{error && (
							<div className='p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700'>
								<AlertCircle className='h-4 w-4 flex-shrink-0' />
								<span>{error}</span>
							</div>
						)}

						<form onSubmit={handleCreate} className='space-y-3.5 text-xs'>
							<div>
								<label className='block font-semibold text-[#172033] mb-1'>
									Full Name *
								</label>
								<input
									type='text'
									required
									value={name}
									onChange={e => setName(e.target.value)}
									placeholder='e.g. Vidhatri Menon'
									className='w-full px-3 py-2 bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'
								/>
							</div>

							<div>
								<label className='block font-semibold text-[#172033] mb-1'>
									Email Address *
								</label>
								<input
									type='email'
									required
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder='name@organization.com'
									className='w-full px-3 py-2 bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'
								/>
							</div>

							<div>
								<label className='block font-semibold text-[#172033] mb-1'>
									Temporary Password
								</label>
								<input
									type='password'
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder='Defaults to standard onboarding password'
									className='w-full px-3 py-2 bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'
								/>
							</div>

							<div className='grid grid-cols-2 gap-3'>
								<div>
									<label className='block font-semibold text-[#172033] mb-1'>
										Team
									</label>
									<select
										value={team}
										onChange={e => setTeam(e.target.value)}
										className='w-full px-3 py-2 bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'>
										{VALID_TEAMS.map(t => (
											<option key={t} value={t}>
												{t}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className='block font-semibold text-[#172033] mb-1'>
										Role
									</label>
									<select
										value={role}
										onChange={e =>
											setRole(e.target.value as 'ADMIN' | 'MANAGER' | 'MEMBER')
										}
										className='w-full px-3 py-2 bg-[#F6F7F4] border border-[#E1E4DF] rounded-lg text-[#172033] focus:outline-none focus:border-[#4656D9]'>
										<option value='MEMBER'>Member</option>
										<option value='MANAGER'>Manager</option>
										<option value='ADMIN'>Administrator</option>
									</select>
								</div>
							</div>

							<div className='flex justify-end gap-2 pt-2 border-t border-[#E1E4DF]'>
								<button
									type='button'
									onClick={() => setIsCreateOpen(false)}
									className='px-3 py-2 text-[#677080] hover:text-[#172033]'>
									Cancel
								</button>
								<button
									type='submit'
									disabled={submitting}
									className='px-4 py-2 bg-[#4656D9] text-white font-medium rounded-lg hover:bg-[#3B4BBF] flex items-center gap-1.5 disabled:opacity-50'>
									{submitting ? (
										<Loader2 className='h-3.5 w-3.5 animate-spin' />
									) : (
										<Check className='h-3.5 w-3.5' />
									)}
									<span>Create Member</span>
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}

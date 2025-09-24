'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import { Trash2, Eye } from 'lucide-react';

type DocSummary = {
	id: string;
	title: string;
	summary: string;
	nodeCount: number;
	createdAt: string | null;
	department?: string | null;
	documentType?: string | null;
	tags?: string[];
};

export default function DocumentsListPage() {
	const [docs, setDocs] = useState<DocSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(10);
	const [totalCount, setTotalCount] = useState(0);
	const [q, setQ] = useState('');
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const load = React.useCallback(async () => {
		setLoading(true);
		try {
			const url = new URL('/api/documents/ingest', window.location.origin);
			url.searchParams.set('page', String(page));
			url.searchParams.set('pageSize', String(pageSize));
			const res = await fetch(url.toString(), { credentials: 'include' });
			const data = await res.json();
			setDocs(data.documents || []);
			setTotalCount(data.totalCount || 0);
		} catch {
			console.error('Failed to load documents');
		} finally {
			setLoading(false);
		}
	}, [page, pageSize]);

	useEffect(() => {
		void load();
	}, [page, pageSize, load]);

	const deleteDoc = async (id: string) => {
		if (!confirm('Delete this document? This cannot be undone.')) return;
		setDeletingId(id);
		try {
			const res = await fetch(`/api/documents/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Delete failed');
			await load();
		} catch {
			alert('Failed to delete document');
		} finally {
			setDeletingId(null);
		}
	};

	const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));

	// simple client-side filter on already fetched page
	const filtered = q.trim()
		? docs.filter(
				d =>
					(d.title || '').toLowerCase().includes(q.toLowerCase()) ||
					(d.summary || '').toLowerCase().includes(q.toLowerCase())
		  )
		: docs;

	return (
		<div className='min-h-screen bg-gray-100'>
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
				<div className='flex items-center justify-between mb-4'>
					<h1 className='text-2xl font-bold text-gray-900'>All Documents</h1>
					<Link href='/dashboard'>
						<Button variant='outline'>Back to Dashboard</Button>
					</Link>
				</div>

				<div className='bg-white rounded-lg shadow-sm p-4 mb-4'>
					<div className='flex items-center gap-3'>
						<Input
							placeholder='Filter this page…'
							value={q}
							onChange={e => setQ(e.target.value)}
						/>
						<div className='flex items-center gap-2 text-sm text-gray-600'>
							<span>Page Size:</span>
							<Input
								type='number'
								className='w-20'
								value={pageSize}
								onChange={e =>
									setPageSize(
										Math.max(5, Math.min(50, Number(e.target.value) || 10))
									)
								}
							/>
						</div>
					</div>
				</div>

				<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
					<table className='min-w-full text-sm'>
						<thead className='bg-gray-50 text-gray-700'>
							<tr>
								<th className='text-left px-4 py-2'>Title</th>
								<th className='text-left px-4 py-2'>Department</th>
								<th className='text-left px-4 py-2'>Type</th>
								<th className='text-left px-4 py-2'>Tags</th>
								<th className='text-left px-4 py-2'>Sections</th>
								<th className='text-left px-4 py-2'>Created</th>
								<th className='text-right px-4 py-2'>Actions</th>
							</tr>
						</thead>
						<tbody className='divide-y'>
							{loading ? (
								<tr>
									<td
										colSpan={7}
										className='px-4 py-6 text-center text-gray-500'>
										Loading…
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className='px-4 py-6 text-center text-gray-500'>
										No documents
									</td>
								</tr>
							) : (
								filtered.map(d => (
									<tr key={d.id} className='hover:bg-gray-50'>
										<td className='px-4 py-2'>
											<div className='font-medium text-gray-900 line-clamp-1'>
												{d.title || 'Untitled'}
											</div>
											<div className='text-xs text-gray-600 line-clamp-2'>
												{d.summary}
											</div>
										</td>
										<td className='px-4 py-2'>{d.department || '-'}</td>
										<td className='px-4 py-2'>{d.documentType || '-'}</td>
										<td className='px-4 py-2'>
											<div className='flex flex-wrap gap-1'>
												{(d.tags || []).slice(0, 4).map((t, i) => (
													<span
														key={i}
														className='px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700'>
														{t}
													</span>
												))}
												{(d.tags || []).length > 4 && (
													<span className='px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700'>
														+{(d.tags || []).length - 4}
													</span>
												)}
											</div>
										</td>
										<td className='px-4 py-2'>{d.nodeCount}</td>
										<td className='px-4 py-2'>
											{d.createdAt
												? new Date(d.createdAt).toLocaleDateString()
												: '-'}
										</td>
										<td className='px-4 py-2 text-right'>
											<div className='flex justify-end gap-2'>
												<Link
													href={`/dashboard/${d.id}`}
													className='inline-flex'>
													<Button size='sm' variant='outline'>
														<Eye className='h-4 w-4 mr-1' /> View
													</Button>
												</Link>
												<Button
													size='sm'
													variant='outline'
													onClick={() => deleteDoc(d.id)}
													disabled={deletingId === d.id}>
													<Trash2 className='h-4 w-4 mr-1' />{' '}
													{deletingId === d.id ? 'Deleting…' : 'Delete'}
												</Button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Pagination controls */}
				<div className='flex items-center justify-between mt-4'>
					<div className='text-sm text-gray-600'>Total: {totalCount}</div>
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							disabled={page <= 0}
							onClick={() => setPage(Math.max(0, page - 1))}>
							Prev
						</Button>
						<div className='text-sm text-gray-700'>
							Page {page + 1} / {totalPages}
						</div>
						<Button
							variant='outline'
							disabled={page + 1 >= totalPages}
							onClick={() => setPage(page + 1)}>
							Next
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

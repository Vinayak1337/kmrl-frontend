'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Upload,
	FileText,
	BarChart3,
	Bell,
	UserPlus
} from 'lucide-react';
import { Button } from '@/components/UI/button';

import { DocumentUploadDialog } from '@/components/dashboard/DocumentUploadDialog';
import { DocumentSearch } from '@/components/dashboard/DocumentSearch';
import { ChatBox } from '@/components/dashboard/ChatBox';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';

// Import API services
import {
	uploadDocuments,
	searchDocuments,
	getDashboardStats,
	getRecentDocuments,
	type SearchFilters,
	type DashboardStats as StatsType,
	type DocumentToUpload,
	type SearchResult
} from '@/lib/dashboard-api';

export default function DashboardPage() {
	// State management
	const [showUploadDialog, setShowUploadDialog] = useState(false);
	const [stats, setStats] = useState<StatsType | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [recentDocuments, setRecentDocuments] = useState<SearchResult[]>([]);
	const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | null>(null);

	// Load initial data
	useEffect(() => {
		loadDashboardData();
		checkUserSession();
	}, []);

	const loadDashboardData = async () => {
		setLoadingStats(true);
		try {
			// Load stats
			const dashboardStats = await getDashboardStats();
			setStats(dashboardStats);

			// Load recent documents
			const recent = await getRecentDocuments(5);
			setRecentDocuments(recent);
		} catch (error) {
			console.error('Failed to load dashboard data:', error);
		} finally {
			setLoadingStats(false);
		}
	};

	const checkUserSession = async () => {
		try {
			const res = await fetch('/api/auth/session');
			const data = await res.json();
			setUserRole(data.user?.role || null);
		} catch {
			setUserRole(null);
		}
	};

	// Handle document upload
	const handleDocumentUpload = async (documents: DocumentToUpload[]) => {
		await uploadDocuments(documents);
		// Reload stats after upload
		await loadDashboardData();
	};

	// Handle document search
	const handleDocumentSearch = async (
		query: string,
		filters?: SearchFilters
	) => {
		return await searchDocuments(query, filters);
	};

	// Handle document click from search - navigate to document detail
	const handleDocumentClick = (doc: SearchResult) => {
		// Open document in new tab with the document ID
		if (doc.id) {
			window.open(`/dashboard/${doc.id}`, '_blank');
		}
	};

	// Prepare stats for display - all from real data
	const statsData = stats
		? [
				{
					title: 'Total Documents',
					value: stats.totalDocuments.toString(),
					icon: FileText,
					change: '' // No fake percentages
				},
				{
					title: 'Total Nodes',
					value: stats.nodesCount.toString(),
					icon: BarChart3,
					change: 'Linked sections'
				},
				{
					title: 'Processed Today',
					value: stats.processedToday.toString(),
					icon: Bell,
					change: stats.processedToday > 0 ? 'New today' : 'None today'
				}
		  ]
		: undefined;

	return (
		<div className='min-h-screen bg-gray-100'>
			{/* Header */}
			<div className='bg-white shadow-sm border-b'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex justify-between items-center py-4'>
						<h1 className='text-2xl font-bold text-gray-900'>
							KMRL Document Intelligence Dashboard
						</h1>
						<div className='flex gap-3'>
							<Button onClick={() => setShowUploadDialog(true)}>
								<Upload className='h-5 w-5 mr-2' />
								Upload Documents
							</Button>
							<Link
								href='/dashboard/documents'
								className='inline-flex items-center'>
								<Button variant='outline'>
									<FileText className='h-5 w-5 mr-2' />
									All Documents
								</Button>
							</Link>

							{userRole === 'ADMIN' && (
								<Link
									href='/dashboard/users'
									className='inline-flex items-center'>
									<Button variant='outline'>
										<UserPlus className='h-5 w-5 mr-2' />
										Manage Users
									</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
				{/* Stats Section */}
				<div className='mb-8'>
					<h2 className='text-lg font-semibold text-gray-900 mb-4'>Overview</h2>
					<DashboardStats stats={statsData} loading={loadingStats} />
				</div>

				{/* Search Section */}
				<div className='mb-8'>
					<h2 className='text-lg font-semibold text-gray-900 mb-4'>
						Search Documents
					</h2>
					<DocumentSearch
						onSearch={handleDocumentSearch}
						onDocumentClick={handleDocumentClick}
					/>
				</div>

				{/* Recent Documents */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
					<div>
						<Card className='h-full border shadow-sm'>
							<CardHeader className='pb-2'>
								<CardTitle className='text-lg'>Recent Documents</CardTitle>
								<CardDescription>
									Access the latest uploads with quick actions and timestamps.
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								{recentDocuments.length === 0 && (
									<div className='text-center py-6 text-sm text-muted-foreground'>
										No documents uploaded yet.
									</div>
								)}
								{recentDocuments.map(doc => (
									<Card key={doc.id} className='border bg-muted/10 shadow-none'>
										<CardHeader className='pb-2'>
											<div className='flex items-start justify-between gap-2'>
												<div>
													<CardTitle className='text-base'>
														{doc.title}
													</CardTitle>
													<CardDescription className='mt-1 line-clamp-2 text-sm'>
														{doc.summary || 'No summary available.'}
													</CardDescription>
												</div>
												<Button
													size='sm'
													variant='outline'
													onClick={() =>
														window.open(`/dashboard/${doc.id}`, '_blank')
													}>
													View
												</Button>
											</div>
										</CardHeader>
										<CardContent className='space-y-2 text-xs text-muted-foreground'>
											<div className='flex flex-wrap items-center gap-3'>
												{doc.department && (
													<span className='flex items-center gap-1'>
														<Badge variant='outline'>{doc.department}</Badge>
													</span>
												)}
												{doc.documentType && (
													<span className='flex items-center gap-1'>
														<Badge variant='secondary'>
															{doc.documentType.replace(/_/g, ' ')}
														</Badge>
													</span>
												)}
												{doc.nodeCount && <span>{doc.nodeCount} sections</span>}
											</div>
											<div className='flex items-center justify-between text-xs'>
												<span className='text-muted-foreground'>
													Uploaded{' '}
													{doc.createdAt
														? new Date(doc.createdAt).toLocaleString()
														: '—'}
												</span>
												{doc.tags && doc.tags.length > 0 && (
													<div className='flex flex-wrap gap-1'>
														{doc.tags.slice(0, 3).map(tag => (
															<Badge key={tag} variant='outline'>
																{tag}
															</Badge>
														))}
													</div>
												)}
											</div>
											{doc.keywords && doc.keywords.length > 0 && (
												<div className='pt-2'>
													<Separator className='my-2' />
													<div className='text-[11px] uppercase tracking-wide text-muted-foreground'>
														Top keywords
													</div>
													<div className='mt-1 flex flex-wrap gap-1'>
														{doc.keywords.slice(0, 6).map(keyword => (
															<Badge key={keyword} variant='secondary'>
																{keyword}
															</Badge>
														))}
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</CardContent>
						</Card>
					</div>

					<div>
						<Card className='h-full border shadow-sm'>
							<CardHeader>
								<CardTitle className='text-lg'>System Status</CardTitle>
								<CardDescription>
									Monitoring signals from ingestion, AI services, and database
									connectivity.
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3 text-sm'>
								<div className='flex justify-between items-center'>
									<span className='text-muted-foreground'>AI Processing</span>
									<Badge variant='secondary'>Active</Badge>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-muted-foreground'>Search Mode</span>
									<Badge variant='secondary'>Keyword</Badge>
								</div>
								<div className='flex justify-between items-center'>
									<span className='text-muted-foreground'>MongoDB</span>
									<Badge variant='secondary'>Connected</Badge>
								</div>
							</CardContent>
							<CardFooter className='border-t bg-muted/30'>
								<Link
									href='/api/status'
									target='_blank'
									className='text-sm text-primary hover:underline'>
									View Full System Status →
								</Link>
							</CardFooter>
						</Card>
					</div>
				</div>

				{/* Chat Assistant */}
				<div className='mt-8'>
					<ChatBox />
				</div>
			</div>

			{/* Upload Dialog */}
			<DocumentUploadDialog
				isOpen={showUploadDialog}
				onClose={() => setShowUploadDialog(false)}
				onUpload={handleDocumentUpload}
			/>
		</div>
	);
}

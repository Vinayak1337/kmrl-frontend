'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
	Upload,
	FileText,
	Database,
	ArrowUpRight,
	Loader2,
	Search,
	MessageSquare,
	TrendingUp,
	Clock,
	Users,
	Settings,
	BarChart3,
	Zap,
	Brain
} from 'lucide-react';
import { Button } from '@/components/UI/button';

import { DocumentUploadDialog } from '@/components/dashboard/DocumentUploadDialog';
import { DocumentSearch } from '@/components/dashboard/DocumentSearch';
import { ChatBox } from '@/components/dashboard/ChatBox';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent
} from '@/components/UI/card';
import { Badge } from '@/components/UI/badge';
import { Separator } from '@/components/UI/separator';
import { ScrollArea } from '@/components/UI/scroll-area';

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
	const [showUploadDialog, setShowUploadDialog] = useState(false);
	const [stats, setStats] = useState<StatsType | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);
	const [recentDocuments, setRecentDocuments] = useState<SearchResult[]>([]);
	const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | null>(null);

	useEffect(() => {
		void loadDashboardData();
		void checkUserSession();
	}, []);

	const loadDashboardData = async () => {
		setLoadingStats(true);
		try {
			const dashboardStats = await getDashboardStats();
			setStats(dashboardStats);

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

	const handleDocumentUpload = async (documents: DocumentToUpload[]) => {
		await uploadDocuments(documents);
		await loadDashboardData();
	};

	const handleDocumentSearch = async (
		query: string,
		filters?: SearchFilters
	) => {
		return await searchDocuments(query, filters);
	};

	const handleDocumentClick = (doc: SearchResult) => {
		if (doc.id) {
			window.open(`/dashboard/${doc.id}`, '_blank');
		}
	};

	return (
		<div className='min-h-screen bg-gradient-to-b from-gray-50 via-blue-50 to-white'>
			{/* Hero Header */}
			<header className='relative overflow-hidden border-b bg-white/80 backdrop-blur'>
				<div className='relative mx-auto max-w-7xl px-6 py-8'>
					<div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
						<div className='space-y-3'>
							<div className='flex items-center gap-3'>
								<div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow'>
									<Brain className='h-6 w-6' />
								</div>
								<div>
									<p className='text-sm font-semibold uppercase tracking-wide text-primary'>
										KMRL Intelligence
									</p>
									<h1 className='text-3xl font-bold text-gray-900 lg:text-4xl'>
										Document Matrix
									</h1>
								</div>
							</div>
							<p className='max-w-2xl text-gray-600'>
								Harness the power of AI to search, analyze, and interact with
								your document corpus. Upload files, explore insights, and chat
								with your knowledge base.
							</p>
						</div>
						<div className='flex flex-wrap gap-3'>
							<Button onClick={() => setShowUploadDialog(true)}>
								<Upload className='mr-2 h-4 w-4' />
								Upload Documents
							</Button>
							<Link href='/dashboard/documents'>
								<Button variant='outline'>
									<FileText className='mr-2 h-4 w-4' />
									Browse Corpus
								</Button>
							</Link>
							{userRole === 'ADMIN' && (
								<Link href='/dashboard/users'>
									<Button variant='ghost' className='hover:bg-blue-50'>
										<Users className='mr-2 h-4 w-4' />
										Team
									</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</header>

			<main className='mx-auto max-w-7xl px-6 py-8'>
				{/* Stats Overview */}
				<div className='mb-8'>
					<h2 className='mb-6 text-xl font-semibold text-gray-900'>
						System Overview
					</h2>
					<div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
						{loadingStats ? (
							<div className='col-span-full flex items-center justify-center rounded-2xl border bg-white/60 p-8'>
								<div className='flex items-center gap-3 text-gray-500'>
									<Loader2 className='h-5 w-5 animate-spin' />
									<span>Loading system metrics...</span>
								</div>
							</div>
						) : (
							<>
								<div className='rounded-2xl border bg-white p-6 shadow-sm'>
									<div className='absolute right-4 top-4 opacity-60'>
										<FileText className='h-8 w-8 text-primary' />
									</div>
									<div className='space-y-2'>
										<p className='text-sm font-medium text-primary'>
											Documents
										</p>
										<p className='text-3xl font-bold text-gray-900'>
											{stats?.totalDocuments || 0}
										</p>
										<p className='text-xs text-gray-500'>Total in corpus</p>
									</div>
								</div>

								<div className='rounded-2xl border bg-white p-6 shadow-sm'>
									<div className='absolute right-4 top-4 opacity-60'>
										<Database className='h-8 w-8 text-primary' />
									</div>
									<div className='space-y-2'>
										<p className='text-sm font-medium text-primary'>Sections</p>
										<p className='text-3xl font-bold text-gray-900'>
											{stats?.nodesCount || 0}
										</p>
										<p className='text-xs text-gray-500'>Indexed nodes</p>
									</div>
								</div>

								<div className='rounded-2xl border bg-white p-6 shadow-sm'>
									<div className='absolute right-4 top-4 opacity-60'>
										<TrendingUp className='h-8 w-8 text-primary' />
									</div>
									<div className='space-y-2'>
										<p className='text-sm font-medium text-primary'>Today</p>
										<p className='text-3xl font-bold text-gray-900'>
											{stats?.processedToday || 0}
										</p>
										<p className='text-xs text-gray-500'>New uploads</p>
									</div>
								</div>

								<div className='rounded-2xl border bg-white p-6 shadow-sm'>
									<div className='absolute right-4 top-4 opacity-60'>
										<Zap className='h-8 w-8 text-primary' />
									</div>
									<div className='space-y-2'>
										<p className='text-sm font-medium text-primary'>
											AI Status
										</p>
										<p className='text-lg font-bold text-gray-900'>Active</p>
										<p className='text-xs text-gray-500'>Processing ready</p>
									</div>
								</div>
							</>
						)}
					</div>
				</div>

				{/* Main Content Grid */}
				<div className='grid gap-8 lg:grid-cols-[1fr,400px]'>
					{/* Primary Actions */}
					<div className='space-y-8'>
						{/* Search Section */}
						<Card className='overflow-hidden border bg-white shadow-sm'>
							<CardHeader className='border-b bg-blue-50/40'>
								<div className='flex items-center gap-3'>
									<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
										<Search className='h-5 w-5' />
									</div>
									<div>
										<CardTitle className='text-lg'>
											Search & Discovery
										</CardTitle>
										<CardDescription>
											Find documents using AI-powered semantic search and
											filters
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className='p-0'>
								<DocumentSearch
									variant='embedded'
									onSearch={handleDocumentSearch}
									onDocumentClick={handleDocumentClick}
								/>
							</CardContent>
						</Card>

						{/* Chat Interface */}
						<Card className='overflow-hidden border bg-white shadow-sm'>
							<CardHeader className='border-b bg-blue-50/40'>
								<div className='flex items-center gap-3'>
									<div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
										<MessageSquare className='h-5 w-5' />
									</div>
									<div>
										<CardTitle className='text-lg'>AI Assistant</CardTitle>
										<CardDescription>
											Chat with your documents using voice or text
										</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent className='p-6'>
								<ChatBox variant='embedded' />
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className='space-y-6'>
						{/* Recent Documents */}
						<Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2 text-base'>
									<Clock className='h-5 w-5 text-gray-600' />
									Recent Uploads
								</CardTitle>
								<CardDescription>
									Latest additions to your corpus
								</CardDescription>
							</CardHeader>
							<CardContent className='p-0'>
								<ScrollArea className='max-h-80'>
									{recentDocuments.length === 0 ? (
										<div className='flex h-32 items-center justify-center text-gray-500'>
											<div className='text-center'>
												<FileText className='mx-auto h-8 w-8 text-gray-300' />
												<p className='mt-2 text-sm'>No documents yet</p>
											</div>
										</div>
									) : (
										<div className='divide-y divide-gray-100'>
											{recentDocuments.map(doc => (
												<div
													key={doc.id}
													className='group p-4 transition-colors hover:bg-gray-50'>
													<div className='flex items-start justify-between gap-3'>
														<div className='min-w-0 flex-1 space-y-2'>
															<div className='flex items-center gap-2'>
																<div className='flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100'>
																	<FileText className='h-4 w-4 text-blue-600' />
																</div>
																<div className='min-w-0 flex-1'>
																	<p className='truncate text-sm font-medium text-gray-900'>
																		{doc.title}
																	</p>
																	<p className='text-xs text-gray-500'>
																		{doc.createdAt
																			? new Date(
																					doc.createdAt
																			  ).toLocaleDateString()
																			: 'Recently'}
																	</p>
																</div>
															</div>
															<div className='flex flex-wrap gap-1'>
																{doc.department && (
																	<Badge variant='outline' className='text-xs'>
																		{doc.department}
																	</Badge>
																)}
																{doc.nodeCount && (
																	<Badge
																		variant='secondary'
																		className='text-xs'>
																		{doc.nodeCount} sections
																	</Badge>
																)}
															</div>
														</div>
														<Button
															size='sm'
															variant='ghost'
															onClick={() =>
																window.open(`/dashboard/${doc.id}`, '_blank')
															}
															className='opacity-0 group-hover:opacity-100 transition-opacity'>
															<ArrowUpRight className='h-4 w-4' />
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</ScrollArea>
							</CardContent>
						</Card>

						{/* System Status */}
						<Card className='border-0 bg-white/80 shadow-lg backdrop-blur-sm'>
							<CardHeader>
								<CardTitle className='flex items-center gap-2 text-base'>
									<BarChart3 className='h-5 w-5 text-gray-600' />
									System Health
								</CardTitle>
								<CardDescription>Monitor service status</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3'>
								<div className='flex items-center justify-between'>
									<span className='text-sm text-gray-600'>AI Processing</span>
									<div className='flex items-center gap-2'>
										<div className='h-2 w-2 rounded-full bg-green-500' />
										<span className='text-sm font-medium text-green-600'>
											Online
										</span>
									</div>
								</div>
								<div className='flex items-center justify-between'>
									<span className='text-sm text-gray-600'>Search Index</span>
									<div className='flex items-center gap-2'>
										<div className='h-2 w-2 rounded-full bg-green-500' />
										<span className='text-sm font-medium text-green-600'>
											Ready
										</span>
									</div>
								</div>
								<div className='flex items-center justify-between'>
									<span className='text-sm text-gray-600'>Database</span>
									<div className='flex items-center gap-2'>
										<div className='h-2 w-2 rounded-full bg-green-500' />
										<span className='text-sm font-medium text-green-600'>
											Connected
										</span>
									</div>
								</div>
								<Separator />
								<Link
									href='/api/status'
									target='_blank'
									className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700'>
									<Settings className='h-4 w-4' />
									<span>View detailed status</span>
									<ArrowUpRight className='h-3 w-3' />
								</Link>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			<DocumentUploadDialog
				isOpen={showUploadDialog}
				onClose={() => setShowUploadDialog(false)}
				onUpload={handleDocumentUpload}
			/>
		</div>
	);
}

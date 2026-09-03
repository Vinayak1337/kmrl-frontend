'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	Home,
	FileText,
	Sparkles,
	CheckSquare,
	Users,
	Shield,
	Clock,
	Plus,
	LogOut,
	Building2,
	User,
	Menu,
	X,
	Search
} from 'lucide-react';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';
import { Omnibox } from './Omnibox';
import { AiSidePanel } from './AiSidePanel';
import { DocumentIngestModal } from '@/components/documents/DocumentIngestModal';

interface WorkspaceShellProps {
	children: React.ReactNode;
}

interface SessionUser {
	id?: string;
	email?: string;
	name?: string;
	role?: 'ADMIN' | 'MANAGER' | 'MEMBER';
	department?: string;
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
	const pathname = usePathname();
	const router = useRouter();

	const [session, setSession] = useState<SessionUser | null>(null);
	const [isIngestOpen, setIsIngestOpen] = useState(false);
	const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
	const [aiPanelQuestion, setAiPanelQuestion] = useState<string | undefined>();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

	// Load session details
	useEffect(() => {
		const checkSession = async () => {
			try {
				const res = await fetch('/api/auth/session');
				if (res.ok) {
					const data = await res.json();
					setSession(data.user || null);
				}
			} catch {
				setSession(null);
			}
		};
		void checkSession();
	}, []);

	// Handle global "ask-docsetu" event
	useEffect(() => {
		const handleOpenAi = (e: CustomEvent<{ question?: string; docId?: string }>) => {
			setAiPanelQuestion(e.detail?.question);
			setIsAiPanelOpen(true);
		};
		window.addEventListener('open-docsetu-ai', handleOpenAi as EventListener);
		return () => window.removeEventListener('open-docsetu-ai', handleOpenAi as EventListener);
	}, []);

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			router.push('/login');
		} catch {
			router.push('/login');
		}
	};

	const primaryNav = [
		{ href: '/home', label: 'Home', icon: Home },
		{ href: '/documents', label: 'Documents', icon: FileText },
		{ href: '/intelligence', label: 'Intelligence', icon: Sparkles },
		{ href: '/actions', label: 'Actions', icon: CheckSquare }
	];

	const adminNav = [
		{ href: '/people', label: 'People', icon: Users },
		{ href: '/access', label: 'Access', icon: Shield },
		{ href: '/audit', label: 'Audit', icon: Clock }
	];

	const isActive = (href: string) => {
		if (href === '/documents') {
			return pathname.startsWith('/documents');
		}
		return pathname === href;
	};

	return (
		<div className='min-h-screen bg-canvas flex flex-col text-text-primary font-sans antialiased'>
			{/* TOPBAR */}
			<header className='h-16 bg-white border-b border-border-default sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4'>
				{/* Brand Logo & Mobile Trigger */}
				<div className='flex items-center gap-3 flex-shrink-0'>
					<button
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className='md:hidden p-1.5 text-[#677080] hover:text-[#172033] rounded-md'>
						{isMobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
					</button>

					<Link href='/home' className='flex items-center'>
						<DocSetuLogo size='md' />
					</Link>

					{/* Organization pill */}
					<div className='hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted border border-border-default text-xs font-medium text-text-secondary ml-2'>
						<Building2 className='h-3.5 w-3.5 text-text-secondary' />
						<span>DocSetu Workspace</span>
					</div>
				</div>

				{/* Center: Omnibox */}
				<div className='flex-1 max-w-xl hidden md:block'>
					<Omnibox
						onAskDocSetu={q => {
							setAiPanelQuestion(q);
							setIsAiPanelOpen(true);
						}}
					/>
				</div>

				{/* Right: Search (mobile), + Add Document button, AI Assistant trigger, Profile */}
				<div className='flex items-center gap-2 sm:gap-3 flex-shrink-0'>
					{/* Mobile Search Button */}
					<button
						onClick={() => setIsMobileSearchOpen(true)}
						className='md:hidden p-2 text-[#677080] hover:text-[#172033] hover:bg-[#F6F7F4] rounded-lg transition-colors'
						aria-label='Search workspace'>
						<Search className='h-4 w-4' />
					</button>

					{/* Ask DocSetu Assistant Button */}
					<button
						onClick={() => {
							setAiPanelQuestion(undefined);
							setIsAiPanelOpen(true);
						}}
						className='hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-strong bg-white text-text-primary hover:bg-surface-muted text-xs font-medium transition-colors'>
						<Sparkles className='h-3.5 w-3.5' />
						<span>Ask DocSetu</span>
					</button>

					{/* Primary Add Document Button */}
					<button
						onClick={() => setIsIngestOpen(true)}
						className='flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4656D9] text-white hover:bg-[#3B4BBF] text-xs font-medium transition-colors shadow-2xs'>
						<Plus className='h-4 w-4' />
						<span className='hidden sm:inline'>Add document</span>
					</button>

					{/* User Avatar Menu */}
					<div className='relative'>
						<button
							onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
							className='w-8 h-8 rounded-full bg-[#172033] text-white flex items-center justify-center text-xs font-semibold hover:ring-2 hover:ring-[#4656D9]/30 transition-all'>
							{session?.name
								? session.name.charAt(0).toUpperCase()
								: session?.email?.charAt(0).toUpperCase() || 'U'}
						</button>

						{isUserMenuOpen && (
							<div className='absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#E1E4DF] py-2 z-50 animate-in fade-in-50 duration-100'>
								<div className='px-4 py-2 border-b border-[#E1E4DF]'>
									<p className='text-xs font-semibold text-[#172033] truncate'>
										{session?.name || 'Workspace Member'}
									</p>
									<p className='text-xs text-[#677080] truncate'>
										{session?.email || 'user@docsetu.internal'}
									</p>
									<span className='inline-block mt-1.5 px-2 py-0.5 rounded bg-surface-muted text-xs font-semibold text-text-secondary uppercase'>
										{session?.role || 'MEMBER'}
									</span>
								</div>

								<div className='py-1'>
									<Link
										href='/people'
										onClick={() => setIsUserMenuOpen(false)}
										className='flex items-center gap-2 px-4 py-2 text-xs text-[#172033] hover:bg-[#F6F7F4]'>
										<User className='h-3.5 w-3.5 text-[#677080]' />
										<span>Organization Directory</span>
									</Link>
									<button
										onClick={handleLogout}
										className='w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50'>
										<LogOut className='h-3.5 w-3.5' />
										<span>Sign Out</span>
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</header>

			{/* BODY LAYOUT: SIDEBAR + CONTENT */}
			<div className='flex flex-1 overflow-hidden'>
				{/* LEFT SIDEBAR (Desktop) */}
				<aside className='w-60 bg-white border-r border-border-default hidden md:flex flex-col justify-between py-5 px-3 flex-shrink-0'>
					<div className='space-y-6'>
						{/* Primary Navigation */}
						<div className='space-y-1'>
							<div className='px-3 pb-1 text-xs font-semibold text-text-tertiary uppercase tracking-[0.12em]'>
								Workspace
							</div>
							{primaryNav.map(item => {
								const Icon = item.icon;
								const active = isActive(item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
											active
												? 'bg-[#4656D9]/10 text-[#4656D9] font-semibold'
												: 'text-[#677080] hover:bg-[#F6F7F4] hover:text-[#172033]'
										}`}>
										<Icon
											className={`h-4 w-4 ${
												active ? 'text-[#4656D9]' : 'text-[#677080]'
											}`}
										/>
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>

						{/* Administration Navigation */}
						<div className='space-y-1'>
							<div className='px-3 pb-1 text-xs font-semibold text-text-tertiary uppercase tracking-[0.12em]'>
								Governance
							</div>
							{adminNav.map(item => {
								const Icon = item.icon;
								const active = isActive(item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
											active
												? 'bg-[#4656D9]/10 text-[#4656D9] font-semibold'
												: 'text-[#677080] hover:bg-[#F6F7F4] hover:text-[#172033]'
										}`}>
										<Icon
											className={`h-4 w-4 ${
												active ? 'text-[#4656D9]' : 'text-[#677080]'
											}`}
										/>
										<span>{item.label}</span>
									</Link>
								);
							})}
						</div>
					</div>

					{/* Sidebar Footer: Active Workspace info */}
					<div className='p-3 bg-surface-muted rounded-xl border border-border-default'>
						<div className='flex items-center justify-between text-xs'>
							<span className='font-semibold text-[#172033]'>DocSetu</span>
							<span className='px-1.5 py-0.5 rounded bg-white border border-border-default text-xs font-semibold text-text-secondary'>
								Active
							</span>
						</div>
						<p className='text-xs text-text-secondary mt-0.5 leading-tight'>
							Document Intelligence Workspace
						</p>
					</div>
				</aside>

				{/* MOBILE NAVIGATION DRAWER */}
				{isMobileMenuOpen && (
					<div className='fixed inset-0 z-50 bg-black/30 md:hidden flex'>
						<div className='w-64 bg-white h-full p-5 flex flex-col justify-between border-r border-[#E1E4DF]'>
							<div className='space-y-6'>
								<div className='flex items-center justify-between pb-4 border-b border-[#E1E4DF]'>
									<DocSetuLogo size='sm' />
									<button
										onClick={() => setIsMobileMenuOpen(false)}
										className='p-1 text-[#677080]'>
										<X className='h-5 w-5' />
									</button>
								</div>

								<div className='space-y-1'>
									{primaryNav.concat(adminNav).map(item => {
										const Icon = item.icon;
										const active = isActive(item.href);
										return (
											<Link
												key={item.href}
												href={item.href}
												onClick={() => setIsMobileMenuOpen(false)}
												className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium ${
													active
														? 'bg-[#4656D9]/10 text-[#4656D9] font-semibold'
														: 'text-[#677080]'
												}`}>
												<Icon className='h-4 w-4' />
												<span>{item.label}</span>
											</Link>
										);
									})}
								</div>
							</div>

							<button
								onClick={handleLogout}
								className='flex items-center gap-2 p-2 text-xs text-red-600'>
								<LogOut className='h-4 w-4' />
								<span>Sign Out</span>
							</button>
						</div>
					</div>
				)}

				{/* MAIN WORKSPACE CONTENT */}
				<main className='flex-1 overflow-y-auto bg-[#F6F7F4]'>
					{children}
				</main>
			</div>

			{/* GLOBAL OVERLAYS */}
			<DocumentIngestModal
				isOpen={isIngestOpen}
				onClose={() => setIsIngestOpen(false)}
				onSuccess={docId => {
					router.push(`/documents/${docId}`);
				}}
			/>

			<AiSidePanel
				isOpen={isAiPanelOpen}
				onClose={() => setIsAiPanelOpen(false)}
				initialQuestion={aiPanelQuestion}
			/>

			{/* Mobile Search Overlay */}
			{isMobileSearchOpen && (
				<div className='fixed inset-0 z-50 bg-black/40 backdrop-blur-xs p-4 flex flex-col items-center pt-12 md:hidden animate-in fade-in-50 duration-150'>
					<div className='w-full max-w-lg bg-white rounded-2xl p-4 shadow-2xl border border-[#E1E4DF] space-y-3'>
						<div className='flex items-center justify-between pb-2 border-b border-[#E1E4DF]'>
							<span className='text-xs font-semibold text-[#172033] flex items-center gap-2'>
								<Search className='h-3.5 w-3.5 text-[#4656D9]' />
								<span>Search Workspace</span>
							</span>
							<button
								onClick={() => setIsMobileSearchOpen(false)}
								className='p-1 rounded-md text-[#677080] hover:text-[#172033] hover:bg-[#F6F7F4]'>
								<X className='h-4 w-4' />
							</button>
						</div>
						<Omnibox
							onAskDocSetu={q => {
								setIsMobileSearchOpen(false);
								setAiPanelQuestion(q);
								setIsAiPanelOpen(true);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

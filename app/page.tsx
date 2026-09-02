'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
	Sparkles,
	ArrowRight,
	CheckCircle2,
	Lock,
	BookOpen,
	Clock,
	ArrowUp
} from 'lucide-react';
import { DocSetuLogo, DocSetuSymbol } from '@/components/brand/DocSetuBrand';

export default function LandingPage() {
	const [activeUseCase, setActiveUseCase] = useState<
		'procurement' | 'legal' | 'government' | 'finance' | 'hr' | 'operations'
	>('procurement');

	const useCases = {
		procurement: {
			tabLabel: 'Procurement',
			query: 'Which purchase orders are waiting for approval and what limits apply?',
			answer:
				'Under the Procurement Policy FY26, 2 purchase requisitions require dual sign-off from Finance and Procurement because they exceed ₹25 Lakhs. Unit managers can approve requisitions up to ₹2.5 Lakhs.',
			sources: [
				{ title: 'Procurement Policy FY26', section: 'Section 2, Pages 5–11' },
				{ title: 'Purchase Approval Framework', section: 'Section 1, Page 3' }
			],
			surfacedAction: 'Dual sign-off checklist required before vendor onboarding'
		},
		legal: {
			tabLabel: 'Legal',
			query: 'Which agreements contain automatic renewal clauses this quarter?',
			answer:
				'The Facility Management Agreement expires on 15 November 2026. A written renewal notice must be issued at least 60 days in advance (by 18 September 2026) to prevent automatic expiration.',
			sources: [
				{ title: 'Facility Management Agreement', section: 'Clause 4, Pages 6–8' }
			],
			surfacedAction: 'Dispatch formal renewal notice to Crestline by 18 Sep'
		},
		government: {
			tabLabel: 'Government',
			query: 'Which circulars introduce compliance deadlines this month?',
			answer:
				'The Statutory Compliance Circular mandates quarterly filing of environmental and occupational safety audits before 30 September across regional operating facilities.',
			sources: [
				{ title: 'Statutory Compliance Circular', section: 'Section 3, Pages 2–4' }
			],
			surfacedAction: 'Submit verified Q2 safety compliance declaration'
		},
		finance: {
			tabLabel: 'Finance',
			query: 'What capital expenditure thresholds require board sanction?',
			answer:
				'Capital acquisitions exceeding ₹25 Lakhs require Managing Committee and Board sanction. Operating expenditures between ₹10 Lakhs and ₹25 Lakhs require joint approval from the CFO and Department Head.',
			sources: [
				{ title: 'Financial Delegation Matrix FY26', section: 'Schedule B, Page 4' }
			],
			surfacedAction: 'Update ERP delegation authorization rules by 30 Sep'
		},
		hr: {
			tabLabel: 'HR',
			query: 'What are the credential deprovisioning timelines for separated personnel?',
			answer:
				'The Information Security SOP requires enterprise credentials and building badge access to be revoked within 4 hours of formal HR separation notification.',
			sources: [
				{ title: 'Information Security SOP', section: 'Section 3, Page 5' }
			],
			surfacedAction: 'Verify automated HR offboarding webhook trigger'
		},
		operations: {
			tabLabel: 'Operations',
			query: 'What maintenance protocols apply during scheduled electrical outages?',
			answer:
				'Standard Operating Procedure 402 requires secondary generator banks to synchronize within 12 seconds of mains isolation, verified by two technicians.',
			sources: [
				{ title: 'Electrical Substation SOP', section: 'Section 4, Pages 9–12' }
			],
			surfacedAction: 'Complete bi-monthly generator load test certificate'
		}
	};

	const pipelineSteps = [
		{
			number: '01',
			title: 'Capture',
			description: 'Upload PDF and text documents individually or in batches.'
		},
		{
			number: '02',
			title: 'Parse',
			description: 'Extract layout, OCR scanned text, and preserve numbered sections.'
		},
		{
			number: '03',
			title: 'Index',
			description: 'Generate section summaries, assign team tags, and index text.'
		},
		{
			number: '04',
			title: 'Search',
			description: 'Query policies and contracts with source citations.'
		},
		{
			number: '05',
			title: 'Track',
			description: 'Surface renewal dates, approval thresholds, and compliance filings.'
		}
	];

	return (
		<div className='min-h-screen bg-[#F6F7F4] text-[#172033] flex flex-col'>
			{/* PUBLIC NAVIGATION */}
			<nav className='h-18 bg-white/90 backdrop-blur-md border-b border-[#E1E4DF] sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between'>
				<DocSetuLogo size='md' />

				<div className='flex items-center gap-3'>
					<Link
						href='/login'
						className='px-4 py-2 text-xs font-medium text-[#172033] hover:text-[#4656D9] transition-colors'>
						Sign in
					</Link>
					<Link
						href='/home'
						className='px-4 py-2 bg-[#4656D9] text-white text-xs font-medium rounded-lg hover:bg-[#3B4BBF] transition-colors shadow-2xs'>
						Open Workspace
					</Link>
				</div>
			</nav>

			{/* MAIN LANDING BODY */}
			<main className='flex-1 space-y-24 py-16 px-6 sm:px-12 max-w-7xl mx-auto w-full'>
				{/* SECTION I: HERO */}
				<section className='space-y-12'>
					<div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-center'>
						{/* Left: Problem + Product */}
						<div className='lg:col-span-6 space-y-6'>
							<div className='inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#4656D9]/10 border border-[#4656D9]/20 text-[11px] font-semibold text-[#4656D9] uppercase tracking-wider'>
								<DocSetuSymbol size='sm' />
								<span>DOCUMENT SEARCH AND COMPLIANCE</span>
							</div>

							<h1 className='text-4xl sm:text-5xl font-extrabold text-[#172033] tracking-tight leading-[1.15]'>
								Search, cross-reference, and track commitments across your organization&rsquo;s documents.
							</h1>

							<p className='text-base text-[#677080] leading-relaxed max-w-xl'>
								DocSetu indexes contracts, policies, SOPs, and circulars so teams can verify rules, check renewal dates, and trace answers back to original page numbers.
							</p>

							<div className='flex flex-wrap items-center gap-3 pt-2'>
								<Link
									href='/home'
									className='inline-flex items-center gap-2 px-6 py-3.5 bg-[#4656D9] text-white text-sm font-semibold rounded-xl hover:bg-[#3B4BBF] transition-all shadow-sm'>
									<span>Open Workspace</span>
									<ArrowRight className='h-4 w-4' />
								</Link>

								<a
									href='#pipeline'
									className='inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-[#E1E4DF] text-sm font-semibold text-[#172033] rounded-xl hover:bg-[#F6F7F4] transition-all shadow-2xs'>
									<span>See how it works</span>
								</a>
							</div>
						</div>

						{/* Right: Product Visualization */}
						<div className='lg:col-span-6'>
							<div className='bg-white rounded-2xl border border-[#E1E4DF] shadow-xl overflow-hidden'>
								{/* Card Top: Ask DocSetu Omnibox */}
								<div className='p-5 bg-[#F6F7F4] border-b border-[#E1E4DF] space-y-2'>
									<div className='flex items-center gap-2 text-xs font-semibold text-[#4656D9] uppercase tracking-wider'>
										<Sparkles className='h-3.5 w-3.5' />
										<span>Ask DocSetu</span>
									</div>
									<div className='p-3 bg-white rounded-lg border border-[#E1E4DF] text-xs font-medium text-[#172033] flex items-center justify-between'>
										<span>Which vendor agreements require action this month?</span>
										<div className='w-6 h-6 rounded-md bg-[#4656D9] text-white flex items-center justify-center'>
											<ArrowUp className='h-3.5 w-3.5' />
										</div>
									</div>
								</div>

								{/* Card Bottom: Surfaced Actions & Grounded Answers */}
								<div className='p-5 space-y-4 text-xs'>
									<div className='text-xs font-semibold text-[#39825E] flex items-center gap-1.5'>
										<CheckCircle2 className='h-4 w-4' />
										<span>3 items require attention</span>
									</div>

									{/* Item 1 */}
									<div className='p-3.5 rounded-xl border border-[#E1E4DF] bg-[#F6F7F4]/50 space-y-1.5 hover:border-[#4656D9] transition-colors'>
										<div className='flex items-center justify-between'>
											<span className='font-bold text-[#172033]'>
												Facility Management Agreement
											</span>
											<span className='px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold'>
												Due 18 Sep
											</span>
										</div>
										<p className='text-xs text-[#677080]'>
											Renewal notice required at least 60 days before expiry.
										</p>
										<div className='flex items-center gap-2 text-[10px] text-[#9098A5] pt-0.5'>
											<span className='font-medium text-[#172033]'>Legal</span>
											<span>/</span>
											<span>Contract</span>
											<span>/</span>
											<span>42 pages</span>
										</div>
									</div>

									{/* Item 2 */}
									<div className='p-3.5 rounded-xl border border-[#E1E4DF] bg-[#F6F7F4]/50 space-y-1.5 hover:border-[#4656D9] transition-colors'>
										<div className='flex items-center justify-between'>
											<span className='font-bold text-[#172033]'>
												Hardware Annual Maintenance Contract
											</span>
											<span className='px-2 py-0.5 rounded bg-[#4656D9]/10 border border-[#4656D9]/20 text-[#4656D9] text-[10px] font-semibold'>
												Approval Pending
											</span>
										</div>
										<p className='text-xs text-[#677080]'>
											Price revision approval pending sign-off from Procurement and Finance.
										</p>
										<div className='flex items-center gap-2 text-[10px] text-[#9098A5] pt-0.5'>
											<span className='font-medium text-[#172033]'>Procurement</span>
											<span>/</span>
											<span>Agreement</span>
											<span>/</span>
											<span>18 pages</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* SECTION II: HOW DOCUMENTS ARE PROCESSED */}
				<section id='pipeline' className='space-y-8 pt-4'>
					<div className='text-center space-y-2 max-w-2xl mx-auto'>
						<h2 className='text-xs font-semibold text-[#4656D9] uppercase tracking-wider'>
							Processing Pipeline
						</h2>
						<p className='text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight'>
							How DocSetu parses and indexes organizational documents
						</p>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
						{pipelineSteps.map(step => (
							<div
								key={step.number}
								className='bg-white rounded-xl border border-[#E1E4DF] p-5 shadow-2xs space-y-3 flex flex-col justify-between'>
								<div className='space-y-2'>
									<div className='text-xs font-mono font-bold text-[#4656D9]'>
										{step.number}
									</div>
									<h3 className='text-sm font-bold text-[#172033]'>
										{step.title}
									</h3>
									<p className='text-xs text-[#677080] leading-relaxed'>
										{step.description}
									</p>
								</div>
								<div className='w-full h-1 bg-[#F1F3F1] rounded-full overflow-hidden'>
									<div className='w-1/2 h-full bg-[#4656D9]' />
								</div>
							</div>
						))}
					</div>
				</section>

				{/* SECTION III: PRODUCT INTERFACE PREVIEW */}
				<section className='space-y-6'>
					<div className='text-center space-y-2 max-w-2xl mx-auto'>
						<h2 className='text-xs font-semibold text-[#4656D9] uppercase tracking-wider'>
							Inspection View
						</h2>
						<p className='text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight'>
							Document details, extracted actions, and section citations
						</p>
					</div>

					<div className='bg-white rounded-2xl border border-[#E1E4DF] shadow-xl p-6 md:p-8 space-y-6'>
						{/* Simulated Workspace Header without dots */}
						<div className='flex items-center justify-between pb-4 border-b border-[#E1E4DF]'>
							<div className='flex items-center gap-3'>
								<DocSetuSymbol size='sm' />
								<span className='text-sm font-bold text-[#172033]'>
									Procurement Policy & Approval Framework FY26
								</span>
								<span className='px-2 py-0.5 rounded bg-[#4656D9]/10 text-[#4656D9] text-[11px] font-medium'>
									Policy
								</span>
								<span className='px-2 py-0.5 rounded bg-[#179C8C]/10 text-[#179C8C] text-[11px] font-medium'>
									Procurement
								</span>
							</div>

							<span className='px-2 py-0.5 rounded border border-[#39825E]/30 bg-[#39825E]/10 text-xs text-[#39825E] font-medium'>
								Indexed
							</span>
						</div>

						{/* Simulated Flagship Tabs without dots */}
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6 text-xs'>
							<div className='p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] space-y-2'>
								<span className='font-bold uppercase text-[10px] tracking-wider text-[#4656D9]'>
									Document Brief
								</span>
								<p className='text-xs text-[#172033] leading-relaxed'>
									Revises delegation of financial authority thresholds and establishes dual-sign-off rules for requisitions above ₹25 Lakhs.
								</p>
							</div>

							<div className='p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] space-y-2'>
								<span className='font-bold uppercase text-[10px] tracking-wider text-[#179C8C]'>
									Extracted Actions
								</span>
								<div className='space-y-1 text-xs text-[#172033]'>
									<p className='font-medium'>
										ERP approval matrix update required by 30 Sep
									</p>
									<p className='text-[#677080]'>
										Finance sign-off checklist to be published
									</p>
								</div>
							</div>

							<div className='p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF] space-y-2'>
								<span className='font-bold uppercase text-[10px] tracking-wider text-amber-700'>
									Priority Notice
								</span>
								<p className='text-xs text-amber-900 font-semibold'>
									Threshold revisions take effect 1 October
								</p>
								<p className='text-[11px] text-amber-700'>
									Operating guidelines must be harmonized prior to effective date.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* SECTION IV: DEPARTMENT WORKFLOWS */}
				<section className='space-y-8'>
					<div className='text-center space-y-2 max-w-2xl mx-auto'>
						<h2 className='text-xs font-semibold text-[#4656D9] uppercase tracking-wider'>
							Department Workflows
						</h2>
						<p className='text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight'>
							Search specific questions across departments
						</p>
					</div>

					{/* Tabs */}
					<div className='flex flex-wrap justify-center gap-2 border-b border-[#E1E4DF] pb-3'>
						{(
							[
								'procurement',
								'legal',
								'government',
								'finance',
								'hr',
								'operations'
							] as const
						).map(tab => (
							<button
								key={tab}
								onClick={() => setActiveUseCase(tab)}
								className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
									activeUseCase === tab
										? 'bg-[#4656D9] text-white shadow-2xs'
										: 'text-[#677080] hover:bg-white hover:text-[#172033]'
								}`}>
								{useCases[tab].tabLabel}
							</button>
						))}
					</div>

					{/* Active Tab Output Display */}
					<div className='bg-white rounded-2xl border border-[#E1E4DF] p-6 md:p-8 shadow-xs space-y-6 max-w-3xl mx-auto'>
						<div className='space-y-1.5'>
							<span className='text-[10px] font-bold uppercase tracking-wider text-[#4656D9]'>
								Question
							</span>
							<h3 className='text-base font-bold text-[#172033]'>
								&ldquo;{useCases[activeUseCase].query}&rdquo;
							</h3>
						</div>

						<div className='space-y-2 p-4 bg-[#F6F7F4] rounded-xl border border-[#E1E4DF]'>
							<span className='text-[10px] font-bold uppercase tracking-wider text-[#179C8C]'>
								Answer
							</span>
							<p className='text-xs text-[#172033] leading-relaxed'>
								{useCases[activeUseCase].answer}
							</p>
						</div>

						<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[#E1E4DF] text-xs'>
							<div className='flex items-center gap-2'>
								<span className='text-[#677080] font-medium'>Source:</span>
								{useCases[activeUseCase].sources.map((s, idx) => (
									<span
										key={idx}
										className='px-2 py-0.5 rounded bg-[#F1F3F1] border border-[#E1E4DF] text-[#172033] font-medium'>
										{s.title} ({s.section})
									</span>
								))}
							</div>

							<span className='text-amber-800 font-medium'>
								{useCases[activeUseCase].surfacedAction}
							</span>
						</div>
					</div>
				</section>

				{/* SECTION V: ACCESS CONTROL & AUDITING */}
				<section className='space-y-8'>
					<div className='text-center space-y-2 max-w-2xl mx-auto'>
						<h2 className='text-xs font-semibold text-[#4656D9] uppercase tracking-wider'>
							Access Control & Auditing
						</h2>
						<p className='text-2xl sm:text-3xl font-bold text-[#172033] tracking-tight'>
							Security boundaries and source citations
						</p>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-3'>
							<div className='w-10 h-10 rounded-lg bg-[#4656D9]/10 text-[#4656D9] flex items-center justify-center'>
								<Lock className='h-5 w-5' />
							</div>
							<h3 className='text-sm font-bold text-[#172033]'>
								Controlled Access
							</h3>
							<p className='text-xs text-[#677080] leading-relaxed'>
								Users only retrieve information from documents their team has authorization to read.
							</p>
						</div>

						<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-3'>
							<div className='w-10 h-10 rounded-lg bg-[#179C8C]/10 text-[#179C8C] flex items-center justify-center'>
								<BookOpen className='h-5 w-5' />
							</div>
							<h3 className='text-sm font-bold text-[#172033]'>
								Source Citations
							</h3>
							<p className='text-xs text-[#677080] leading-relaxed'>
								Generated answers link to the exact page numbers and clauses in the original uploaded file.
							</p>
						</div>

						<div className='bg-white rounded-xl border border-[#E1E4DF] p-6 shadow-2xs space-y-3'>
							<div className='w-10 h-10 rounded-lg bg-[#172033]/10 text-[#172033] flex items-center justify-center'>
								<Clock className='h-5 w-5' />
							</div>
							<h3 className='text-sm font-bold text-[#172033]'>
								Audit Trail
							</h3>
							<p className='text-xs text-[#677080] leading-relaxed'>
								Uploads, permission changes, exports, and administrative actions are logged with actor and timestamp records.
							</p>
						</div>
					</div>
				</section>

				{/* SECTION VI: FINAL CTA */}
				<section className='bg-[#172033] text-white rounded-3xl p-10 sm:p-14 text-center space-y-6 shadow-xl'>
					<div className='max-w-xl mx-auto space-y-3'>
						<h2 className='text-2xl sm:text-4xl font-extrabold tracking-tight'>
							Start searching your organization&rsquo;s documents.
						</h2>
						<p className='text-xs sm:text-sm text-[#CBD5E1] leading-relaxed'>
							Index your first batch of contracts, policies, and circulars in DocSetu.
						</p>
					</div>

					<div className='pt-2'>
						<Link
							href='/home'
							className='inline-flex items-center gap-2 px-8 py-3.5 bg-[#4656D9] text-white text-sm font-semibold rounded-xl hover:bg-[#3B4BBF] transition-all shadow-md'>
							<span>Open Workspace</span>
							<ArrowRight className='h-4 w-4' />
						</Link>
					</div>
				</section>
			</main>

			{/* PUBLIC FOOTER */}
			<footer className='border-t border-[#E1E4DF] bg-white py-8 px-6 sm:px-12 text-xs text-[#677080] flex flex-col sm:flex-row items-center justify-between gap-4'>
				<DocSetuLogo size='sm' />
				<p>&copy; {new Date().getFullYear()} DocSetu. All rights reserved.</p>
				<div className='flex items-center gap-4 text-xs font-medium'>
					<Link href='/login' className='hover:text-[#172033]'>
						Sign in
					</Link>
					<Link href='/home' className='hover:text-[#172033]'>
						Workspace
					</Link>
				</div>
			</footer>
		</div>
	);
}

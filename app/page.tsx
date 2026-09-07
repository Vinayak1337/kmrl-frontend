'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
	Sparkles,
	ArrowRight,
	CheckCircle2,
	BookOpen,
	ArrowUp,
	ShieldCheck
} from 'lucide-react';
import { DocSetuLogo, DocSetuSymbol } from '@/components/brand/DocSetuBrand';

export default function LandingPage() {
	const [activeUseCase, setActiveUseCase] = useState<
		'procurement' | 'legal' | 'safety' | 'finance' | 'electrical' | 'operations'
	>('procurement');

	const useCases = {
		procurement: {
			tabLabel: 'Procurement',
			query: 'Which purchase requisitions require Board sign-off and what limits apply?',
			answer:
				'Under the Procurement Policy FY26 (Section 1, Page 3), capital acquisitions exceeding ₹25 Lakhs require Managing Director sanction and Board notification. Operational expenses between ₹10L and ₹25L require joint GM and CFO sign-off.',
			sources: [
				{ title: 'Procurement Policy & Matrix FY26', section: 'Section 1, Pages 3-7' },
				{ title: 'Delegation of Financial Powers', section: 'Schedule B, Page 2' }
			],
			surfacedAction: 'Enforce two-packet technical tender rules for tenders over ₹50 Lakhs'
		},
		legal: {
			tabLabel: 'Legal',
			query: 'What are the formal renewal notice deadlines for station retail concessions?',
			answer:
				'The Edapally Station Retail Concession Agreement expires on 15 November 2026. Clause 4 explicitly mandates written renewal notice 60 days in advance (by 18 September 2026) to preserve preferential tenancy rights.',
			sources: [
				{ title: 'Retail Concession Agreement - Edapally', section: 'Clause 4, Page 7' }
			],
			surfacedAction: 'Dispatch formal lease extension notice to concessionaire before 18 Sep'
		},
		safety: {
			tabLabel: 'Safety & CMRS',
			query: 'What compliance filings are mandated following the annual CMRS safety audit?',
			answer:
				'The CMRS Inspection Circular directives mandate quarterly verified safety declarations for traction third rail earthing and station fire suppression readiness by 25 September across all Phase 1 stations.',
			sources: [
				{ title: 'CMRS Safety Inspection Circular', section: 'Directive 2, Pages 4-6' }
			],
			surfacedAction: 'Submit verified Q3 fire suppression and earthing certification'
		},
		finance: {
			tabLabel: 'Finance',
			query: 'What are the bank guarantee validity rules for multi-year infrastructure tenders?',
			answer:
				'Performance Bank Guarantees must remain valid for a minimum of 90 days beyond the contract completion or defects liability period, issued by a scheduled nationalized bank with automatic claim lodging.',
			sources: [
				{ title: 'Financial Delegation Framework FY26', section: 'Annexure D, Page 14' }
			],
			surfacedAction: 'Audit active BG expiration dates against ERP registry before 30 Sep'
		},
		electrical: {
			tabLabel: 'Electrical',
			query: 'What tolerances apply during traction substation backup generator synchronization?',
			answer:
				'TSS Operating Procedure requires secondary generator banks to synchronize and assume essential ventilation load within 12 seconds of 110kV grid mains dropout, verified via SCADA telemetry logs.',
			sources: [
				{ title: 'Substation Power Synchronization Protocol', section: 'Section 3, Pages 8-11' }
			],
			surfacedAction: 'Conduct bi-monthly 12-second load synchronization test certificate'
		},
		operations: {
			tabLabel: 'Operations',
			query: 'What are the non-revenue corridor foot patrol rules and point machine limits?',
			answer:
				'Daily patrol teams must complete laser gauge track scans between 01:00 AM and 04:30 AM. Point machine throw resistance must not exceed 450 kgf and toe clearance must be 115mm ± 2mm.',
			sources: [
				{ title: 'Track & Signaling Maintenance SOP 2026', section: 'Section 1, Pages 1-4' }
			],
			surfacedAction: 'Upload nocturnal track laser scan logs into asset portal before 06:00 AM'
		}
	};

	const pipelineSteps = [
		{
			category: 'Ingestion',
			title: 'Capture & OCR',
			description: 'Ingest multi-page PDF, DOCX, and scanned circulars preserving exact formatting and page boundaries.'
		},
		{
			category: 'Segmentation',
			title: 'Sequential Node Chaining',
			description: 'Segment manuals into sequential linked nodes preserving section hierarchies and technical parameters.'
		},
		{
			category: 'Synthesis',
			title: 'Contextual Extraction',
			description: 'Autonomous reasoning models extract decisions, deadlines, compliance liabilities, and responsible owners.'
		},
		{
			category: 'Verification',
			title: 'Grounded Interrogation',
			description: 'Query policies with precise citation chips linking answers directly back to original source page numbers.'
		},
		{
			category: 'Execution',
			title: 'Obligation Tracking',
			description: 'Automatically surface renewal windows, sign-off limits, and regulatory filing deadlines into action boards.'
		}
	];

	return (
		<div className='min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col selection:bg-[#EFF6FF] selection:text-[#1E40AF]'>
			{/* PUBLIC TOP NAVIGATION */}
			<nav className='h-18 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0] sticky top-0 z-50 px-6 sm:px-12 flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<DocSetuLogo size='md' />
					<span className='hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800'>
						<span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
						<span>Reasoning Engine Online</span>
					</span>
				</div>

				<div className='flex items-center gap-3'>
					<Link
						href='/login'
						className='px-4 py-2 text-xs font-medium text-[#4B5563] hover:text-[#111827] transition-colors'>
						Sign in
					</Link>
					<Link
						href='/home'
						className='btn-island py-2 px-4 text-xs'>
						<span>Open Workspace</span>
						<div className='btn-island-icon w-5 h-5'>
							<ArrowRight className='h-3 w-3' />
						</div>
					</Link>
				</div>
			</nav>

			{/* MAIN CONTENT */}
			<main className='flex-1 space-y-28 py-16 sm:py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full'>
				{/* SECTION I: HERO */}
				<section className='space-y-12'>
					<div className='grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center'>
						{/* Left: Headline & Rationale */}
						<div className='lg:col-span-6 space-y-6'>
							<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E2E8F0] text-[11px] font-semibold text-slate-600 uppercase tracking-[0.12em] shadow-xs'>
								<DocSetuSymbol size='sm' />
								<span>INTELLIGENT DOCUMENT REPOSITORY & COMPLIANCE</span>
							</div>

							<h1 className='text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.12]'>
								Search, cross-reference, and audit commitments across organizational documents.
							</h1>

							<p className='text-base text-slate-600 leading-relaxed max-w-xl'>
								DocSetu indexes contracts, standard operating procedures, circulars, and maintenance manuals. Officers can verify approval limits, track renewal deadlines, and trace answers back to exact source page numbers.
							</p>

							<div className='flex flex-wrap items-center gap-3 pt-3'>
								<Link
									href='/home'
									className='btn-island'>
									<span>Enter Workspace</span>
									<div className='btn-island-icon'>
										<ArrowRight className='h-3.5 w-3.5' />
									</div>
								</Link>

								<a
									href='#pipeline'
									className='inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs'>
									<span>Explore Pipeline</span>
								</a>
							</div>
						</div>

						{/* Right: Double-Bezel Interactive Preview */}
						<div className='lg:col-span-6'>
							<div className='card-bezel'>
								<div className='card-bezel-inner p-5 sm:p-6 space-y-5'>
									{/* Faux Window Chrome */}
									<div className='flex items-center justify-between pb-3 border-b border-slate-100'>
										<div className='flex items-center gap-1.5'>
											<div className='w-2.5 h-2.5 rounded-full bg-slate-200'></div>
											<div className='w-2.5 h-2.5 rounded-full bg-slate-200'></div>
											<div className='w-2.5 h-2.5 rounded-full bg-slate-200'></div>
										</div>
										<span className='text-[10px] font-mono text-slate-400 uppercase tracking-wider'>
											docsetu-query-engine // verified-citations
										</span>
									</div>

									{/* Query Pill */}
									<div className='p-3.5 bg-slate-50 rounded-2xl border border-[#E2E8F0] flex items-center justify-between gap-3'>
										<div className='flex items-center gap-2.5 min-w-0'>
											<Sparkles className='h-4 w-4 text-[#2563EB] flex-shrink-0' />
											<span className='text-xs font-medium text-[#0F172A] truncate'>
												Which commercial concession agreements require action this quarter?
											</span>
										</div>
										<div className='w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0'>
											<ArrowUp className='h-3 w-3' />
										</div>
									</div>

									{/* Synthesized Response */}
									<div className='space-y-3 pt-1'>
										<div className='flex items-center justify-between'>
											<span className='text-xs font-semibold text-teal-700 flex items-center gap-1.5'>
												<CheckCircle2 className='h-3.5 w-3.5' />
												<span>1 High-Priority Action Surfaced</span>
											</span>
											<span className='text-[11px] font-mono text-slate-400'>
												Confidence 99.4%
											</span>
										</div>

										<div className='p-4 rounded-2xl border border-[#E2E8F0] bg-white space-y-2 shadow-xs hover:border-[#2563EB]/40 transition-colors'>
											<div className='flex items-center justify-between'>
												<span className='text-xs font-bold text-[#0F172A]'>
													Commercial Retail Concession - Edapally Station
												</span>
												<span className='px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-semibold tracking-wide'>
													Due 18 Sep 2026
												</span>
											</div>
											<p className='text-xs text-slate-600 leading-relaxed'>
												Clause 4 mandates formal written lease extension notice at least 60 days prior to expiry to preserve preferential negotiation rights.
											</p>
											<div className='flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-mono'>
												<span className='text-[#2563EB] font-semibold'>Legal</span>
												<span>/</span>
												<span>Clause 4, Page 7</span>
												<span>/</span>
												<span>18 Pages</span>
											</div>
										</div>

										<div className='p-4 rounded-2xl border border-[#E2E8F0] bg-white space-y-2 shadow-xs hover:border-[#2563EB]/40 transition-colors'>
											<div className='flex items-center justify-between'>
												<span className='text-xs font-bold text-[#0F172A]'>
													Procurement Policy & Financial Matrix FY26
												</span>
												<span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-semibold tracking-wide'>
													Dual Sign-off
												</span>
											</div>
											<p className='text-xs text-slate-600 leading-relaxed'>
												Requisitions exceeding ₹25 Lakhs require formal Managing Director sanction and Board audit notification.
											</p>
											<div className='flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-mono'>
												<span className='text-[#2563EB] font-semibold'>Procurement</span>
												<span>/</span>
												<span>Section 1, Page 3</span>
												<span>/</span>
												<span>42 Pages</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* SECTION II: PIPELINE */}
				<section id='pipeline' className='space-y-12 pt-8'>
					<div className='text-center space-y-3 max-w-2xl mx-auto'>
						<div className='inline-block px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-semibold uppercase tracking-[0.15em]'>
							Processing Architecture
						</div>
						<h2 className='text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight'>
							How DocSetu parses and indexes organizational sources
						</h2>
						<p className='text-sm text-slate-600'>
							From unstructured PDF manuals to structured, cross-referenced intelligence with source-grounded evidence.
						</p>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4'>
						{pipelineSteps.map((step, idx) => (
							<div
								key={idx}
								className='card-bezel'>
								<div className='card-bezel-inner p-5 space-y-3'>
									<div className='text-[10px] font-semibold text-[#2563EB] uppercase tracking-wider'>
										{step.category}
									</div>
									<h3 className='text-sm font-bold text-[#0F172A] tracking-tight'>
										{step.title}
									</h3>
									<p className='text-xs text-slate-600 leading-relaxed'>
										{step.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</section>

				{/* SECTION III: USE CASE MATRIX */}
				{/* SECTION III: USE CASE MATRIX */}
				<section className='space-y-10'>
					<div className='space-y-3 text-center max-w-2xl mx-auto'>
						<div className='inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] font-semibold uppercase tracking-[0.15em]'>
							Functional Domains
						</div>
						<h2 className='text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight'>
							Tested across core transport & municipal domains
						</h2>
					</div>

					{/* Domain Tabs */}
					<div className='flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto'>
						{(Object.keys(useCases) as Array<keyof typeof useCases>).map(k => (
							<button
								key={k}
								onClick={() => setActiveUseCase(k)}
								className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
									activeUseCase === k
										? 'bg-[#0F172A] text-white shadow-xs'
										: 'bg-white border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 hover:text-slate-900'
								}`}>
								{useCases[k].tabLabel}
							</button>
						))}
					</div>

					{/* Active Use Case Card */}
					<div className='card-bezel max-w-4xl mx-auto'>
						<div className='card-bezel-inner p-6 sm:p-8 space-y-6'>
							<div className='space-y-2'>
								<div className='text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider'>
									Query Prompt
								</div>
								<h3 className='text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight'>
									&ldquo;{useCases[activeUseCase].query}&rdquo;
								</h3>
							</div>

							<div className='p-5 rounded-2xl bg-slate-50 border border-[#E2E8F0] space-y-3'>
								<div className='text-[10px] font-mono font-semibold text-teal-800 uppercase tracking-wider flex items-center gap-1.5'>
									<Sparkles className='h-3.5 w-3.5 text-teal-600' />
									<span>Synthesized Answer · Grounded Evidence</span>
								</div>
								<p className='text-sm text-[#0F172A] leading-relaxed'>
									{useCases[activeUseCase].answer}
								</p>
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2'>
								<div className='space-y-2'>
									<div className='text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider'>
										Grounded Evidence Citations
									</div>
									<div className='space-y-1.5'>
										{useCases[activeUseCase].sources.map((s, idx) => (
											<div
												key={idx}
												className='flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-medium text-[#0F172A]'>
												<BookOpen className='h-3.5 w-3.5 text-[#2563EB] flex-shrink-0' />
												<span className='truncate'>{s.title}</span>
												<span className='text-[10px] text-slate-400 ml-auto font-mono'>
													{s.section}
												</span>
											</div>
										))}
									</div>
								</div>

								<div className='space-y-2'>
									<div className='text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider'>
										Extracted Action Item
									</div>
									<div className='p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 font-medium leading-relaxed'>
										{useCases[activeUseCase].surfacedAction}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* SECTION IV: SECURITY & COMPLIANCE CALLOUT */}
				<section className='card-bezel'>
					<div className='card-bezel-inner p-8 sm:p-12 text-center space-y-6'>
						<div className='w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto shadow-xs'>
							<ShieldCheck className='h-6 w-6' />
						</div>
						<div className='space-y-2 max-w-xl mx-auto'>
							<h2 className='text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight'>
								Role-isolated repository governance
							</h2>
							<p className='text-xs sm:text-sm text-slate-600 leading-relaxed'>
								KMRL documents remain protected with department clearances (ADMIN, MANAGER, MEMBER). Confidential circulars and financial matrices are only surfaced to authorized officers.
							</p>
						</div>

						<div className='pt-2'>
							<Link
								href='/home'
								className='btn-island py-3 px-6 text-xs'>
								<span>Enter DocSetu Workspace</span>
								<div className='btn-island-icon'>
									<ArrowRight className='h-3.5 w-3.5' />
								</div>
							</Link>
						</div>
					</div>
				</section>
			</main>

			{/* FOOTER */}
			<footer className='border-t border-[#E2E8F0] bg-white py-12 px-6 sm:px-12 text-xs text-slate-500'>
				<div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4'>
					<div className='flex items-center gap-3'>
						<DocSetuLogo size='sm' />
						<span>· Kochi Metro Rail Limited (KMRL)</span>
					</div>
					<div className='flex items-center gap-6'>
						<span className='text-[11px] text-slate-500'>Intelligent Document Repository · Verified Citations</span>
						<Link href='/login' className='hover:text-[#0F172A] transition-colors'>
							Sign In
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}

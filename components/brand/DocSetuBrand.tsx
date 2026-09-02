'use client';

import React from 'react';

interface LogoProps {
	className?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	showText?: boolean;
	light?: boolean;
}

/**
 * DocSetu Brand Mark: Two abstract document planes connected across a central bridge path
 * Symbolizes: Documents (sources) -> Bridge ("Setu") -> Structured Intelligence
 */
export function DocSetuSymbol({
	className = '',
	size = 'md',
	light = false
}: {
	className?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
	light?: boolean;
}) {
	const dimensions = {
		sm: { width: 22, height: 22 },
		md: { width: 28, height: 28 },
		lg: { width: 36, height: 36 },
		xl: { width: 48, height: 48 }
	}[size];

	const primaryColor = light ? '#FFFFFF' : '#4656D9'; // DocSetu Indigo
	const tealColor = light ? '#6FE3D4' : '#179C8C'; // Bridge Teal
	const inkColor = light ? '#CBD5E1' : '#172033'; // DocSetu Ink

	return (
		<svg
			width={dimensions.width}
			height={dimensions.height}
			viewBox='0 0 40 40'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			className={`inline-block flex-shrink-0 ${className}`}
			aria-label='DocSetu Brand Mark'>
			{/* Left Upper Document Plane */}
			<rect
				x='5'
				y='6'
				width='11'
				height='15'
				rx='2.5'
				fill={primaryColor}
				fillOpacity='0.9'
			/>
			<line
				x1='8'
				y1='10'
				x2='13'
				y2='10'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
			/>
			<line
				x1='8'
				y1='14'
				x2='12'
				y2='14'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeOpacity='0.7'
			/>

			{/* Left Lower Document Plane */}
			<rect
				x='5'
				y='24'
				width='11'
				height='10'
				rx='2'
				fill={inkColor}
				fillOpacity='0.8'
			/>

			{/* Bridge Connector Path */}
			<path
				d='M16 13.5L20 17.5M16 29L20 25'
				stroke={tealColor}
				strokeWidth='2'
				strokeLinecap='round'
			/>

			{/* Central Bridge Node (Diamond Intelligence Nexus) */}
			<path
				d='M23 20L20 16.5L17 20L20 23.5L23 20Z'
				fill={tealColor}
			/>

			{/* Right Converged Structured Plane */}
			<rect
				x='24'
				y='9'
				width='12'
				height='22'
				rx='2.5'
				fill={primaryColor}
			/>
			{/* Inner structured intelligence lines */}
			<line
				x1='27'
				y1='14'
				x2='33'
				y2='14'
				stroke={tealColor}
				strokeWidth='1.75'
				strokeLinecap='round'
			/>
			<line
				x1='27'
				y1='18'
				x2='32'
				y2='18'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
			/>
			<line
				x1='27'
				y1='22'
				x2='33'
				y2='22'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeOpacity='0.8'
			/>
			<line
				x1='27'
				y1='26'
				x2='30'
				y2='26'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeOpacity='0.6'
			/>
		</svg>
	);
}

export function DocSetuLogo({
	className = '',
	size = 'md',
	showText = true,
	light = false
}: LogoProps) {
	const textSizes = {
		sm: 'text-base',
		md: 'text-lg',
		lg: 'text-xl',
		xl: 'text-2xl'
	}[size];

	return (
		<div className={`flex items-center gap-2.5 select-none ${className}`}>
			<DocSetuSymbol size={size} light={light} />
			{showText && (
				<div className='flex items-baseline tracking-tight'>
					<span
						className={`font-semibold font-sans ${textSizes} ${
							light ? 'text-white' : 'text-[#172033]'
						}`}>
						Doc<span className={light ? 'text-[#6FE3D4]' : 'text-[#4656D9]'}>Setu</span>
					</span>
				</div>
			)}
		</div>
	);
}

export function DocSetuLoadingIndicator({
	size = 'md',
	text = 'Understanding document…'
}: {
	size?: 'sm' | 'md' | 'lg';
	text?: string;
}) {
	return (
		<div className='flex flex-col items-center justify-center p-6 space-y-4'>
			<div className='relative flex items-center justify-center animate-pulse'>
				<DocSetuSymbol size={size === 'sm' ? 'md' : 'lg'} />
			</div>
			{text && (
				<p className='text-xs font-medium tracking-wide uppercase text-[#677080] animate-pulse'>
					{text}
				</p>
			)}
		</div>
	);
}

export function DocSetuEmptyState({
	title,
	description,
	action
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<div className='flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-[#E1E4DF] bg-[#F6F7F4]/50'>
			<div className='w-12 h-12 rounded-full bg-white border border-[#E1E4DF] shadow-xs flex items-center justify-center mb-4'>
				<DocSetuSymbol size='sm' />
			</div>
			<h3 className='text-sm font-semibold text-[#172033]'>{title}</h3>
			<p className='mt-1 text-xs text-[#677080] max-w-sm leading-relaxed'>
				{description}
			</p>
			{action && <div className='mt-4'>{action}</div>}
		</div>
	);
}

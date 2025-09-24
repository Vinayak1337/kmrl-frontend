'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
	children: string;
	className?: string;
};

export function MarkdownRenderer({
	children,
	className
}: MarkdownRendererProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			className={className || 'prose prose-sm max-w-none text-gray-800'}>
			{children}
		</ReactMarkdown>
	);
}

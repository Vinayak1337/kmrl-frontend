import * as React from 'react';
import { cn } from '@/lib/ui';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
	direction?: 'horizontal' | 'vertical';
}

export const Separator = ({
	direction = 'horizontal',
	className,
	...props
}: SeparatorProps) => {
	return (
		<div
			role='separator'
			className={cn(
				direction === 'horizontal'
					? 'h-px w-full bg-gray-200'
					: 'w-px h-full bg-gray-200',
				className
			)}
			{...props}
		/>
	);
};

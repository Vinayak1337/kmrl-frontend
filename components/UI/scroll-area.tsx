import * as React from 'react';
import { cn } from '@/lib/ui';

type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>;

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn('relative overflow-y-auto', className)}
			{...props}>
			{children}
		</div>
	)
);
ScrollArea.displayName = 'ScrollArea';

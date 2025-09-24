import * as React from 'react';
import { cn } from '@/lib/ui';

export const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			'rounded-xl border border-gray-200 bg-white shadow-sm',
			className
		)}
		{...props}
	/>
));
Card.displayName = 'Card';

export const CardHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('px-6 py-4 border-b bg-gray-50/60 rounded-t-xl', className)}
		{...props}
	/>
);

export const CardTitle = ({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
	<h3
		className={cn('text-base font-semibold text-gray-900', className)}
		{...props}
	/>
);

export const CardDescription = ({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p className={cn('text-sm text-gray-500', className)} {...props} />
);

export const CardContent = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('p-6', className)} {...props} />
);

export const CardFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('px-6 py-4 border-t bg-gray-50/60 rounded-b-xl', className)}
		{...props}
	/>
);

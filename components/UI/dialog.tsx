import * as React from 'react';
import { cn } from '@/lib/ui';
import { X } from 'lucide-react';

interface DialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
	open,
	onOpenChange,
	children
}) => {
	const previous = React.useRef<boolean | undefined>(open);
	React.useEffect(() => {
		if (previous.current !== open) {
			onOpenChange?.(Boolean(open));
			previous.current = open;
		}
	}, [open, onOpenChange]);

	if (!open) return null;
	return <>{children}</>;
};

export const DialogOverlay = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			className
		)}
		{...props}
	/>
));
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
	<div className='fixed inset-0 z-50 flex items-center justify-center'>
		<DialogOverlay onClick={onClose} />
		<div
			ref={ref}
			className={cn(
				'relative z-50 grid w-full max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
				className
			)}
			{...props}>
			{children}
			{onClose && (
				<button
					onClick={onClose}
					className='absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500'>
					<X className='h-4 w-4' />
					<span className='sr-only'>Close</span>
				</button>
			)}
		</div>
	</div>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col space-y-1.5 text-center sm:text-left',
			className
		)}
		{...props}
	/>
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
			className
		)}
		{...props}
	/>
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h2
		ref={ref}
		className={cn(
			'text-lg font-semibold leading-none tracking-tight',
			className
		)}
		{...props}
	/>
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

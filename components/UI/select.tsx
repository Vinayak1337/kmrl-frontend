import * as React from 'react';
import { cn } from '@/lib/ui';

type SelectContextType = {
	open: boolean;
	setOpen: (v: boolean) => void;
	value: string;
	setValue: (v: string) => void;
	onValueChange?: (v: string) => void;
	selectedLabel?: string;
	setSelectedLabel: (l?: string) => void;
	placeholder?: string;
	menuId: string;
};

const SelectCtx = React.createContext<SelectContextType | null>(null);

export interface RootSelectProps {
	value: string;
	onValueChange: (v: string) => void;
	placeholder?: string;
	children: React.ReactNode;
	className?: string;
}

export function Select({
	value,
	onValueChange,
	placeholder,
	children,
	className
}: RootSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [selectedLabel, setSelectedLabel] = React.useState<string | undefined>(
		undefined
	);
	const menuId = React.useId();
	const containerRef = React.useRef<HTMLDivElement>(null);

	// Close on outside click
	React.useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (!containerRef.current) return;
			if (!containerRef.current.contains(e.target as Node)) setOpen(false);
		}
		if (open) document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [open]);

	const ctx: SelectContextType = {
		open,
		setOpen,
		value,
		setValue: v => onValueChange(v),
		onValueChange,
		selectedLabel,
		setSelectedLabel,
		placeholder,
		menuId
	};

	return (
		<SelectCtx.Provider value={ctx}>
			<div ref={containerRef} className={cn('relative', className)}>
				{children}
			</div>
		</SelectCtx.Provider>
	);
}

export interface SelectTriggerProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	children?: React.ReactNode; // usually omitted; we render value/placeholder
}

export function SelectTrigger({
	className,
	children,
	...props
}: SelectTriggerProps) {
	const ctx = React.useContext(SelectCtx);
	if (!ctx) throw new Error('SelectTrigger must be used within Select');
	const label = ctx.selectedLabel ?? (ctx.value || ctx.placeholder || 'Select');
	return (
		<button
			type='button'
			aria-haspopup='listbox'
			aria-expanded={ctx.open}
			aria-controls={ctx.menuId}
			onClick={() => ctx.setOpen(!ctx.open)}
			className={cn(
				'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
				className
			)}
			{...props}>
			<span
				className={cn(!ctx.value && !ctx.selectedLabel ? 'text-gray-500' : '')}>
				{children ?? label}
			</span>
			<svg
				className='ml-2 h-4 w-4 text-gray-500'
				viewBox='0 0 20 20'
				fill='currentColor'
				aria-hidden='true'>
				<path
					fillRule='evenodd'
					d='M5.23 7.21a.75.75 0 011.06.02L10 11.186l3.71-3.955a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0l-4.24-4.52a.75.75 0 01.02-1.06z'
					clipRule='evenodd'
				/>
			</svg>
		</button>
	);
}

export function SelectValue({
	placeholder,
	className
}: {
	placeholder?: string;
	className?: string;
}) {
	const ctx = React.useContext(SelectCtx);
	if (!ctx) throw new Error('SelectValue must be used within Select');
	const label =
		ctx.selectedLabel ??
		(ctx.value || ctx.placeholder || placeholder || 'Select');
	return (
		<span
			className={cn(
				!ctx.value && !ctx.selectedLabel ? 'text-gray-500' : '',
				className
			)}>
			{label}
		</span>
	);
}

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>;
export function SelectContent({
	className,
	children,
	...props
}: SelectContentProps) {
	const ctx = React.useContext(SelectCtx);
	if (!ctx) throw new Error('SelectContent must be used within Select');
	if (!ctx.open) return null;
	return (
		<div
			id={ctx.menuId}
			role='listbox'
			className={cn(
				'absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg',
				className
			)}
			{...props}>
			{children}
		</div>
	);
}

interface SelectItemProps extends React.LiHTMLAttributes<HTMLDivElement> {
	value: string;
}
export function SelectItem({
	value,
	className,
	children,
	...props
}: SelectItemProps) {
	const ctx = React.useContext(SelectCtx);
	if (!ctx) throw new Error('SelectItem must be used within Select');
	const selected = ctx.value === value;
	return (
		<div
			role='option'
			aria-selected={selected}
			onMouseDown={e => {
				e.preventDefault();
				ctx.setValue(value);
				ctx.setSelectedLabel(
					typeof children === 'string' ? children : undefined
				);
				ctx.setOpen(false);
			}}
			className={cn(
				'cursor-pointer select-none rounded-md px-3 py-2 text-sm text-gray-900 hover:bg-gray-100',
				selected ? 'bg-gray-100' : '',
				className
			)}
			{...props}>
			{children}
		</div>
	);
}

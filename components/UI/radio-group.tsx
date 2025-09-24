import * as React from 'react';
import { cn } from '@/lib/ui';

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
	value?: string;
	onValueChange?: (value: string) => void;
};

type RadioGroupItemProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	'type'
> & {
	id?: string;
};

export const RadioGroup = ({
	className,
	value,
	onValueChange,
	children,
	...props
}: RadioGroupProps) => {
	return (
		<div role='radiogroup' className={cn('grid gap-2', className)} {...props}>
			{React.Children.map(children, child => {
				if (!React.isValidElement(child)) return child;
				const childValue = (child.props as RadioGroupItemProps).value;
				return React.cloneElement(
					child as React.ReactElement<RadioGroupItemProps>,
					{
						onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
							onValueChange?.(event.target.value);
						},
						checked: value === childValue
					}
				);
			})}
		</div>
	);
};

export const RadioGroupItem = React.forwardRef<
	HTMLInputElement,
	RadioGroupItemProps
>(({ className, ...props }, ref) => {
	return (
		<input
			type='radio'
			ref={ref}
			className={cn(
				'focus-visible:ring-primary h-4 w-4 rounded border border-gray-300 text-primary outline-none transition duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
				className
			)}
			{...props}
		/>
	);
});
RadioGroupItem.displayName = 'RadioGroupItem';

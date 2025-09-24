import * as React from 'react';
import { cn } from '@/lib/ui';

export interface RadioProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
	({ className, label, ...props }, ref) => (
		<label className='inline-flex items-center gap-2 text-sm text-gray-700'>
			<input
				ref={ref}
				type='radio'
				className={cn(
					'h-4 w-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500',
					className
				)}
				{...props}
			/>
			{label && <span>{label}</span>}
		</label>
	)
);
Radio.displayName = 'Radio';

export { RadioGroup, RadioGroupItem } from './radio-group';

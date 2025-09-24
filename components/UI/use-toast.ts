import { useCallback } from 'react';

type ToastOptions = {
	title: string;
	description?: string;
	variant?: 'default' | 'destructive';
};

export function useToast() {
	const toast = useCallback((options: ToastOptions) => {
		if (options.variant === 'destructive') {
			console.error(`[toast] ${options.title}: ${options.description ?? ''}`);
		} else {
			console.info(`[toast] ${options.title}: ${options.description ?? ''}`);
		}
	}, []);

	return { toast };
}

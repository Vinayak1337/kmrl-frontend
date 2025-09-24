'use client';

import React, { useState } from 'react';
import { Button } from '@/components/UI/button';
import { Textarea } from '@/components/UI/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/UI/radio-group';
import {
	Select,
	SelectTrigger,
	SelectContent,
	SelectItem,
	SelectValue
} from '@/components/UI/select';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter
} from '@/components/UI/card';
import { useToast } from '@/components/UI/use-toast';

const FEEDBACK_TYPES = [
	{ value: 'correction', label: 'Correction' },
	{ value: 'missing_info', label: 'Missing Info' },
	{ value: 'reprocess', label: 'Trigger Reprocess' },
	{ value: 'other', label: 'Other' }
];

export function FeedbackForm({ docId }: { docId: string }) {
	const [type, setType] = useState('correction');
	const [message, setMessage] = useState('');
	const [severity, setSeverity] = useState('medium');
	const [sending, setSending] = useState(false);
	const { toast } = useToast();

	const submit = async () => {
		if (!message.trim()) {
			toast({
				title: 'Message required',
				description: 'Please enter a short description.'
			});
			return;
		}
		setSending(true);
		try {
			const res = await fetch(`/api/documents/${docId}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ type, message, severity })
			});
			if (!res.ok) throw new Error('Failed');
			setMessage('');
			toast({
				title: 'Feedback submitted',
				description: 'We will review and follow up shortly.'
			});
		} catch {
			toast({
				title: 'Submission failed',
				description: 'Please try again later.',
				variant: 'destructive'
			});
		} finally {
			setSending(false);
		}
	};

	return (
		<Card className='border shadow-sm'>
			<CardHeader>
				<CardTitle className='text-base'>Submit Feedback</CardTitle>
				<CardDescription>
					Flag issues or request reprocessing for this document.
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='space-y-2'>
					<label className='text-xs text-muted-foreground'>Feedback type</label>
					<Select value={type} onValueChange={setType}>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Choose type' />
						</SelectTrigger>
						<SelectContent>
							{FEEDBACK_TYPES.map(option => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className='space-y-2'>
					<label className='text-xs text-muted-foreground'>Severity</label>
					<RadioGroup
						value={severity}
						onValueChange={setSeverity}
						className='grid grid-cols-3 gap-2 text-sm text-muted-foreground'>
						<label className='flex items-center gap-2 rounded-md border px-3 py-2'>
							<RadioGroupItem value='low' /> Low
						</label>
						<label className='flex items-center gap-2 rounded-md border px-3 py-2'>
							<RadioGroupItem value='medium' /> Medium
						</label>
						<label className='flex items-center gap-2 rounded-md border px-3 py-2'>
							<RadioGroupItem value='high' /> High
						</label>
					</RadioGroup>
				</div>
				<div className='space-y-2'>
					<label className='text-xs text-muted-foreground'>Details</label>
					<Textarea
						value={message}
						onChange={event => setMessage(event.target.value)}
						placeholder='Describe the issue or missing info…'
						rows={4}
					/>
				</div>
			</CardContent>
			<CardFooter className='flex items-center justify-between'>
				<Button
					onClick={submit}
					disabled={sending || !message.trim()}
					size='sm'>
					{sending ? 'Sending…' : 'Submit Feedback'}
				</Button>
				<span className='text-xs text-muted-foreground'>Doc ID: {docId}</span>
			</CardFooter>
		</Card>
	);
}

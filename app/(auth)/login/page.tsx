'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';

export default function LoginPage() {
	const router = useRouter();
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		email: '',
		password: ''
	});
	const [errors, setErrors] = useState({
		email: '',
		password: '',
		general: ''
	});

	const validateForm = () => {
		const newErrors = { email: '', password: '', general: '' };
		let isValid = true;

		if (!formData.email) {
			newErrors.email = 'Email is required';
			isValid = false;
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			newErrors.email = 'Please enter a valid email address';
			isValid = false;
		}

		if (!formData.password) {
			newErrors.password = 'Password is required';
			isValid = false;
		} else if (formData.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters';
			isValid = false;
		}

		setErrors(newErrors);
		return isValid;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);
		setErrors({ email: '', password: '', general: '' });

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: formData.email, password: formData.password })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				setErrors(prev => ({
					...prev,
					general: data.error || 'Invalid credentials. Please verify your email and password.'
				}));
				return;
			}

			// Redirect to DocSetu Home
			router.push('/home');
		} catch (error) {
			console.error('Login request failed', error);
			setErrors(prev => ({
				...prev,
				general: 'Unable to connect to the authentication service.'
			}));
		} finally {
			setIsLoading(false);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({ ...prev, [name]: value }));
		if (errors[name as keyof typeof errors]) {
			setErrors(prev => ({ ...prev, [name]: '' }));
		}
	};

	return (
		<div className='min-h-screen bg-[#F6F7F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<div className='sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3'>
				<div className='flex justify-center'>
					<DocSetuLogo size='lg' />
				</div>
				<h2 className='text-xl font-bold text-[#172033] tracking-tight'>
					Sign in to your organization workspace
				</h2>
				<p className='text-xs text-[#677080]'>
					Document intelligence, cross-team discovery, and action tracking.
				</p>
			</div>

			<div className='mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4'>
				<div className='bg-white py-8 px-6 shadow-xl rounded-2xl border border-[#E1E4DF] sm:px-8 space-y-6'>
					{errors.general && (
						<div className='rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800'>
							{errors.general}
						</div>
					)}

					<form className='space-y-4 text-xs' onSubmit={handleSubmit}>
						<div>
							<label
								htmlFor='email'
								className='block font-semibold text-[#172033] mb-1'>
								Work Email
							</label>
							<div className='relative'>
								<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9098A5]'>
									<Mail className='h-4 w-4' />
								</div>
								<input
									id='email'
									name='email'
									type='email'
									autoComplete='email'
									required
									value={formData.email}
									onChange={handleChange}
									placeholder='name@organization.com'
									className={`w-full pl-9 pr-3 py-2.5 bg-[#F6F7F4] border ${
										errors.email ? 'border-red-400' : 'border-[#E1E4DF]'
									} rounded-lg text-sm text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9] focus:bg-white transition-all`}
								/>
							</div>
							{errors.email && (
								<p className='mt-1 text-[11px] text-red-600'>{errors.email}</p>
							)}
						</div>

						<div>
							<label
								htmlFor='password'
								className='block font-semibold text-[#172033] mb-1'>
								Password
							</label>
							<div className='relative'>
								<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9098A5]'>
									<Lock className='h-4 w-4' />
								</div>
								<input
									id='password'
									name='password'
									type={showPassword ? 'text' : 'password'}
									autoComplete='current-password'
									required
									value={formData.password}
									onChange={handleChange}
									placeholder='••••••••'
									className={`w-full pl-9 pr-10 py-2.5 bg-[#F6F7F4] border ${
										errors.password ? 'border-red-400' : 'border-[#E1E4DF]'
									} rounded-lg text-sm text-[#172033] placeholder-[#9098A5] focus:outline-none focus:border-[#4656D9] focus:bg-white transition-all`}
								/>
								<button
									type='button'
									className='absolute inset-y-0 right-0 pr-3 flex items-center text-[#9098A5] hover:text-[#172033]'
									onClick={() => setShowPassword(!showPassword)}>
									{showPassword ? (
										<EyeOff className='h-4 w-4' />
									) : (
										<Eye className='h-4 w-4' />
									)}
								</button>
							</div>
							{errors.password && (
								<p className='mt-1 text-[11px] text-red-600'>{errors.password}</p>
							)}
						</div>

						<div className='pt-2'>
							<button
								type='submit'
								disabled={isLoading}
								className='w-full py-2.5 px-4 rounded-lg bg-[#4656D9] text-white text-xs font-semibold hover:bg-[#3B4BBF] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4656D9] disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2'>
								{isLoading ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : null}
								<span>{isLoading ? 'Signing in…' : 'Sign in to DocSetu'}</span>
							</button>
						</div>
					</form>

					<div className='pt-2 border-t border-[#E1E4DF] text-center'>
						<Link
							href='/'
							className='text-xs text-[#677080] hover:text-[#172033] transition-colors'>
							&larr; Back to DocSetu overview
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

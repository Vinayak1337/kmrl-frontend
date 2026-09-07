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
		<div className='min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#0F172A]'>
			<div className='sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3'>
				<div className='flex justify-center'>
					<DocSetuLogo size='lg' />
				</div>
				<h2 className='text-2xl font-extrabold text-[#0F172A] tracking-tight'>
					Sign in to your organization workspace
				</h2>
				<p className='text-xs text-slate-600'>
					Document intelligence, cross-team discovery, and action tracking.
				</p>
			</div>

			<div className='mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4'>
				<div className='card-bezel'>
					<div className='card-bezel-inner p-6 sm:p-8 space-y-5 bg-white'>
						{errors.general && (
							<div className='rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800'>
								{errors.general}
							</div>
						)}

						<form className='space-y-4 text-xs' onSubmit={handleSubmit}>
							<div>
								<label
									htmlFor='email'
									className='block font-semibold text-[#0F172A] mb-1'>
									Work Email
								</label>
								<div className='relative'>
									<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
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
										className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border ${
											errors.email ? 'border-red-400' : 'border-[#E2E8F0]'
										} rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all`}
									/>
								</div>
								{errors.email && (
									<p className='mt-1 text-[11px] text-red-600'>{errors.email}</p>
								)}
							</div>

							<div>
								<label
									htmlFor='password'
									className='block font-semibold text-[#0F172A] mb-1'>
									Password
								</label>
								<div className='relative'>
									<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400'>
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
										className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border ${
											errors.password ? 'border-red-400' : 'border-[#E2E8F0]'
										} rounded-xl text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:bg-white transition-all`}
									/>
									<button
										type='button'
										className='absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700'
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

							{/* Quick Demo Credentials */}
							<div className='pt-1'>
								<div className='text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2'>
									Quick Demo Credentials
								</div>
								<div className='flex gap-2'>
									<button
										type='button'
										onClick={() => setFormData({ email: 'admin@example.com', password: 'admin123' })}
										className='flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors text-center'>
										Admin Account
									</button>
									<button
										type='button'
										onClick={() => setFormData({ email: 'vin@gmail.com', password: 'admin123' })}
										className='flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors text-center'>
										Manager Account
									</button>
								</div>
							</div>

							<div className='pt-2'>
								<button
									type='submit'
									disabled={isLoading}
									className='w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-2'>
									{isLoading ? (
										<Loader2 className='h-4 w-4 animate-spin' />
									) : null}
									<span>{isLoading ? 'Signing in...' : 'Sign in to DocSetu'}</span>
								</button>
							</div>
						</form>

						<div className='pt-3 border-t border-[#E2E8F0] text-center'>
							<Link
								href='/'
								className='text-xs text-slate-500 hover:text-[#0F172A] transition-colors'>
								&larr; Back to DocSetu overview
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

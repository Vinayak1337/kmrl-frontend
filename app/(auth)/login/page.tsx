'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
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

  return <main id="main-content" className="auth-page">
    <section className="auth-intro"><Link href="/"><DocSetuLogo size="lg" /></Link><div><p className="eyebrow">The document workspace</p><h1>Back to<br />the work at hand.</h1><p>Find your documents, review the details, and keep the next step in sight.</p></div><Link href="/" className="text-link">← Back to DocSetu</Link></section>
    <section className="auth-form"><div><p className="eyebrow">Workspace access</p><h2>Sign in</h2><p>Use your organization account to continue.</p></div>
      <form onSubmit={handleSubmit} className="form-stack">
        {errors.general && <p className="notice error" role="alert">{errors.general}</p>}
        <label htmlFor="email">Work email<input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required value={formData.email} onChange={handleChange} placeholder="name@organization.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} /></label>
        {errors.email && <p id="email-error" className="field-error">{errors.email}</p>}
        <label htmlFor="password">Password<span className="password-field"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={formData.password} onChange={handleChange} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'password-error' : undefined} /><button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
        {errors.password && <p id="password-error" className="field-error">{errors.password}</p>}
        <button type="submit" disabled={isLoading} className="button button-primary">{isLoading && <Loader2 size={16} className="animate-spin" />}{isLoading ? 'Signing in…' : 'Sign in to workspace'}</button>
      </form>
      <div className="demo-access"><h3>Take a look around</h3><p>Choose a demo account to fill the sign-in details.</p><div><button className="button" onClick={() => setFormData({ email: 'admin@example.com', password: 'admin123' })}>Demo administrator</button><button className="button" onClick={() => setFormData({ email: 'vin@gmail.com', password: 'admin123' })}>Demo manager</button></div></div>
      <Link href="/request-deployment" className="text-link">Need workspace access? →</Link>
    </section>
  </main>;
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';

interface FormState {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  organizationSize: string;
  documentVolume: string;
  currentTools: string;
  complianceFocus: string;
  deploymentTimeline: string;
  message: string;
}

const INITIAL_STATE: FormState = {
  organizationName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  role: '',
  organizationSize: '',
  documentVolume: '',
  currentTools: '',
  complianceFocus: '',
  deploymentTimeline: '',
  message: '',
};

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;

export default function RequestDeploymentPage() {
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'general', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof FormState | 'general', string>> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required.';
    }

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Primary contact name is required.';
    }

    if (!formData.contactEmail.trim() || !EMAIL_REGEX.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Enter a valid contact email.';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Tell us about your deployment goals.';
    }

    if (formData.message.length > 4000) {
      newErrors.message = 'Message must be under 4000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setIsSuccess(false);

    try {
      const payload = Object.fromEntries(
        Object.entries(formData)
          .filter(([, value]) => value.trim().length > 0)
          .map(([key, value]) => [key, value.trim()])
      );

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message = Array.isArray(result?.errors)
          ? result.errors.join(', ')
          : result?.error || 'We could not submit your request. Please try again.';
        setErrors({ general: message });
        return;
      }

      setIsSuccess(true);
      setFormData(INITIAL_STATE);
    } catch (error) {
      console.error('Failed to submit deployment request', error);
      setErrors({ general: 'We hit a network issue while sending your request. Try again shortly.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: Array<{ name: keyof FormState; label: string; required?: boolean; type?: string; autoComplete?: string }> = [
    { name: 'organizationName', label: 'Organization', required: true, autoComplete: 'organization' },
    { name: 'contactName', label: 'Contact name', required: true, autoComplete: 'name' },
    { name: 'contactEmail', label: 'Work email', required: true, type: 'email', autoComplete: 'email' },
    { name: 'contactPhone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
    { name: 'role', label: 'Your role', autoComplete: 'organization-title' },
    { name: 'organizationSize', label: 'Organization size' },
    { name: 'documentVolume', label: 'Approximate document volume' },
    { name: 'currentTools', label: 'Current document tools' },
    { name: 'complianceFocus', label: 'Compliance requirements' },
    { name: 'deploymentTimeline', label: 'When would you like to start?' }
  ];
  return <main id="main-content" className="request-page"><Link href="/"><DocSetuLogo/></Link><header className="page-heading"><div><p className="eyebrow">For your organization</p><h1>Request workspace access</h1><p>Tell us about your team and the documents you work with.</p></div></header>{isSuccess ? <section className="notice" role="status"><h2>Request received</h2><p>Your details have been submitted.</p><Link href="/" className="text-link">Return to DocSetu →</Link></section> : <form className="form-stack" onSubmit={handleSubmit}>{errors.general && <p className="notice error" role="alert">{errors.general}</p>}<p className="muted">Organization, contact name, work email, and a message are required.</p><div className="form-columns">{fields.map(field=><label key={field.name}>{field.label}{field.required ? ' *' : ''}<input name={field.name} type={field.type || 'text'} autoComplete={field.autoComplete || 'off'} value={formData[field.name]} onChange={handleChange} required={field.required} aria-invalid={!!errors[field.name]} />{errors[field.name] && <span className="field-error">{errors[field.name]}</span>}</label>)}</div><label>What does your team need? *<textarea name="message" value={formData.message} onChange={handleChange} required rows={5} maxLength={4000} placeholder="Describe your document workflows and access requirements…" />{errors.message && <span className="field-error">{errors.message}</span>}</label><div className="modal-actions"><Link href="/login" className="button">Back to sign in</Link><button type="submit" className="button button-primary" disabled={isSubmitting}>{isSubmitting?'Sending request…':'Send access request'}</button></div></form>}</main>;
}

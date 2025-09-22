'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  User,
  Mail,
  Phone,
  Briefcase,
  Users,
  Server,
  ShieldCheck,
  CalendarClock,
  MessageSquare,
  Loader2,
} from 'lucide-react';

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

  return (
    <div className="light-scope min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-gray-900 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl p-10 md:p-14 space-y-10">
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              On-premise ready deployment
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Request Your Private Document Intelligence Dashboard
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Tell us about your environment and priorities. Our team will follow up with a tailored installation plan so your organization can run KMRL independently on your infrastructure.
            </p>
          </div>

          {isSuccess && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-800">
              <h2 className="text-lg font-semibold">Request received</h2>
              <p className="mt-2 text-sm">
                Thanks for reaching out. We will review your requirements and get in touch with next steps within one business day.
              </p>
            </div>
          )}

          {errors.general && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="text-sm">{errors.general}</p>
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Organization details
              </h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                    Organization name
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="organizationName"
                      name="organizationName"
                      value={formData.organizationName}
                      onChange={handleChange}
                      className={`w-full rounded-xl border ${
                        errors.organizationName ? 'border-red-300' : 'border-gray-200'
                      } bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
                      placeholder="Acme Transport Authority"
                    />
                  </div>
                  {errors.organizationName && (
                    <p className="mt-2 text-xs text-red-600">{errors.organizationName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="organizationSize" className="block text-sm font-medium text-gray-700">
                    Organization size (optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Users className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="organizationSize"
                      name="organizationSize"
                      value={formData.organizationSize}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="500+ staff"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                    Primary contact
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="contactName"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      className={`w-full rounded-xl border ${
                        errors.contactName ? 'border-red-300' : 'border-gray-200'
                      } bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
                      placeholder="Jane Doe"
                    />
                  </div>
                  {errors.contactName && (
                    <p className="mt-2 text-xs text-red-600">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role or title (optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Director of Compliance"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                    Contact email
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className={`w-full rounded-xl border ${
                        errors.contactEmail ? 'border-red-300' : 'border-gray-200'
                      } bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
                      placeholder="jane.doe@example.com"
                    />
                  </div>
                  {errors.contactEmail && (
                    <p className="mt-2 text-xs text-red-600">{errors.contactEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                    Contact phone (optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                Deployment landscape
              </h2>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="documentVolume" className="block text-sm font-medium text-gray-700">
                    Approximate document volume (optional)
                  </label>
                  <input
                    id="documentVolume"
                    name="documentVolume"
                    value={formData.documentVolume}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="1M legacy PDFs"
                  />
                </div>

                <div>
                  <label htmlFor="currentTools" className="block text-sm font-medium text-gray-700">
                    Current stack / tools (optional)
                  </label>
                  <input
                    id="currentTools"
                    name="currentTools"
                    value={formData.currentTools}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="SharePoint, Box, custom ECM"
                  />
                </div>

                <div>
                  <label htmlFor="complianceFocus" className="block text-sm font-medium text-gray-700">
                    Compliance focus (optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <ShieldCheck className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="complianceFocus"
                      name="complianceFocus"
                      value={formData.complianceFocus}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="GDPR, HIPAA, internal retention"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="deploymentTimeline" className="block text-sm font-medium text-gray-700">
                    Desired timeline (optional)
                  </label>
                  <div className="mt-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CalendarClock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="deploymentTimeline"
                      name="deploymentTimeline"
                      value={formData.deploymentTimeline}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Pilot in Q1, rollout by Q2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Deployment goals
              </h2>
              <label htmlFor="message" className="mt-4 block text-sm font-medium text-gray-700">
                How can we help? Share the workflows, data sources, or pain points you want this dashboard to solve.
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                className={`mt-2 w-full rounded-2xl border ${
                  errors.message ? 'border-red-300' : 'border-gray-200'
                } bg-white py-3 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200`}
                placeholder="We need multilingual access to policy manuals and audit reports across our depots..."
              />
              {errors.message && (
                <p className="mt-2 text-xs text-red-600">{errors.message}</p>
              )}
            </div>

            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-gray-500">
                Already have credentials?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in here
                </Link>
                .
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending request...
                  </>
                ) : (
                  'Submit deployment request'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Need a quick conversation first? Email us at{' '}
            <a href="mailto:hello@kmrl.ai" className="text-blue-600 hover:text-blue-500">
              hello@kmrl.ai
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

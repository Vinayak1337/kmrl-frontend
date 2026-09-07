import React from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';
interface LogoProps { className?: string; size?: Size; showText?: boolean; light?: boolean }
export function DocSetuSymbol({ className = '', size = 'md', light = false }: { className?: string; size?: Size; light?: boolean }) {
  const dimension = { sm: 24, md: 30, lg: 38, xl: 48 }[size];
  return <svg width={dimension} height={dimension} viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
    <path d="M5 4h17l9 9v19H5V4Z" fill={light ? '#f5f4ee' : '#294f43'} />
    <path d="M22 4v9h9M11 18h14M11 23h14M11 28h8" stroke={light ? '#294f43' : '#f5f4ee'} strokeWidth="1.7" />
  </svg>;
}
export function DocSetuLogo({ className = '', size = 'md', showText = true, light = false }: LogoProps) {
  return <span className={`brand ${light ? 'brand-light' : ''} ${className}`} translate="no"><DocSetuSymbol size={size} light={light} />{showText && <span>DocSetu<span className="brand-period">.</span></span>}</span>;
}
export function DocSetuLoadingIndicator({ size = 'md', text = 'Loading document…' }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  return <div className="empty-state" role="status"><DocSetuSymbol size={size} /><p>{text}</p><div className="loading-rule" /></div>;
}
export function DocSetuEmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="empty-state"><DocSetuSymbol /><h3>{title}</h3><p>{description}</p>{action}</section>;
}

import React from 'react';
import { BRAND_VIEWBOX, BRAND_PATH, BRAND_FOLD } from './mark';

type Size = 'sm' | 'md' | 'lg' | 'xl';
interface LogoProps { className?: string; size?: Size; showText?: boolean; light?: boolean }
export function DocSetuSymbol({ className = '', size = 'md', light = false }: { className?: string; size?: Size; light?: boolean }) {
  const dimension = { sm: 24, md: 30, lg: 38, xl: 48 }[size];
  return <svg width={dimension} height={dimension} viewBox={BRAND_VIEWBOX} fill="none" aria-hidden="true" className={className}>
    <path d={BRAND_PATH} fill={light ? '#FFFEFA' : '#294F43'} />
    <path d={BRAND_FOLD} fill={light ? '#ACCEB7' : '#739482'} />
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

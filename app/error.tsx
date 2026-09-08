'use client';
import Link from 'next/link';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="status-page"><Link href="/"><DocSetuLogo/></Link><p className="eyebrow">Unable to open this view</p><h1>Something interrupted<br/>your work.</h1><p>Try loading the page again. If the problem continues, return to your workspace.</p><div><button className="button button-primary" onClick={reset}>Try again</button><Link className="button" href="/home">Go to workspace</Link></div></main>;
}

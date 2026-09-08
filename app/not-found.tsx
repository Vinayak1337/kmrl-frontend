import Link from 'next/link';
import { DocSetuLogo } from '@/components/brand/DocSetuBrand';
export default function NotFound() {
  return <main id="main-content" className="status-page"><Link href="/"><DocSetuLogo/></Link><p className="eyebrow">Page not found · 404</p><h1>This page isn’t<br/>in the collection.</h1><p>The address may have changed. Head to the workspace to find your documents.</p><div><Link className="button button-primary" href="/home">Go to workspace</Link><Link className="button" href="/">DocSetu home</Link></div></main>;
}

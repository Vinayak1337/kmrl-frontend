import type { Metadata } from 'next';
import '@/styles/globals.css';
import localFont from 'next/font/local';

const geist = localFont({ src: '../public/fonts/geist-latin.woff2', variable: '--font-geist-sans', display: 'swap', weight: '100 900' });
const mono = localFont({ src: '../public/fonts/geist-mono-latin.woff2', variable: '--font-geist-mono', display: 'swap', weight: '100 900' });

export const metadata: Metadata = {
	title: 'DocSetu — Document workspace',
	description:
		'An organizational intelligence workspace built around documents. Collect, understand, and connect information across documents, languages, and teams.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' className={`${geist.variable} ${mono.variable}`}>
			<body className='antialiased'>
				<a className="skip-link" href="#main-content">Skip to content</a>
				{children}
			</body>
		</html>
	);
}

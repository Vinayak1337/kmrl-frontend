import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
	title: 'DocSetu — Organizational Intelligence Workspace',
	description:
		'An organizational intelligence workspace built around documents. Collect, understand, and connect information across documents, languages, and teams.'
};

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' className='force-light'>
			<body className='antialiased bg-[#F6F7F4] text-[#172033] min-h-screen'>
				{children}
			</body>
		</html>
	);
}

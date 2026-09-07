import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
	title: 'DocSetu - Organizational Intelligence Workspace',
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
			<body className='antialiased bg-[#F8FAFC] text-[#0F172A] min-h-screen'>
				{children}
			</body>
		</html>
	);
}

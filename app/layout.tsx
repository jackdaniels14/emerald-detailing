import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import GoogleAnalytics from '@/components/GoogleAnalytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Emerald | Software & AI Platform',
  description: 'Manage your AI agents, monitor software projects, and showcase your tools. Built for developers and creators.',
  keywords: ['AI agents', 'software projects', 'developer tools', 'AI management', 'project monitoring'],
  authors: [{ name: 'Emerald' }],
  openGraph: {
    title: 'Emerald | Software & AI Platform',
    description: 'Manage your AI agents, monitor software projects, and showcase your tools.',
    siteName: 'Emerald',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emerald | Software & AI Platform',
    description: 'Manage your AI agents, monitor software projects, and showcase your tools.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

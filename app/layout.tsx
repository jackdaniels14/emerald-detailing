import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import FacebookPixel from '@/components/FacebookPixel';
import LocalBusinessSchema from '@/components/LocalBusinessSchema';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Emerald Detailing | Professional Mobile Car Detailing',
  description: 'Professional mobile car detailing services in the Greater Seattle area. We come to you! Interior, exterior, and full detail packages available.',
  keywords: ['car detailing', 'mobile detailing', 'Seattle', 'auto detailing', 'car wash', 'interior detailing', 'exterior detailing'],
  authors: [{ name: 'Emerald Detailing' }],
  openGraph: {
    title: 'Emerald Detailing | Professional Mobile Car Detailing',
    description: 'Professional mobile car detailing services in the Greater Seattle area. We come to you!',
    url: 'https://emeralddetailers.com',
    siteName: 'Emerald Detailing',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emerald Detailing | Professional Mobile Car Detailing',
    description: 'Professional mobile car detailing services in the Greater Seattle area. We come to you!',
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL('https://emeralddetailers.com'),
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
        <FacebookPixel />
        <LocalBusinessSchema />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

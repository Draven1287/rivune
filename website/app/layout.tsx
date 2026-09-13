import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './rivune-tokens.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteTitle = 'Rivune — your AI tools, one reviewed result';
const siteDescription =
  'An open-source native workspace that discovers compatible AI command-line tools, coordinates their work, and returns one reviewed result.';

export const metadata: Metadata = {
  metadataBase: new URL('https://rivune.seventhman.chatgpt.site'),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: '/brand/rivune-orbit-stars.png',
    apple: '/brand/rivune-orbit-stars.png',
  },
  openGraph: {
    type: 'website',
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Rivune — your AI tools, one reviewed result',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

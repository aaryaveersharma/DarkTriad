import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Dark Triad — Facial Harmony & Looksmaxxing Protocol',
  description:
    'Precision facial harmony analysis and looksmaxxing protocol built for Indians.',
  openGraph: {
    title: 'Dark Triad — Facial Harmony & Looksmaxxing Protocol',
    description:
      'Precision facial harmony analysis and looksmaxxing protocol built for Indians.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dark Triad — Facial Harmony & Looksmaxxing Protocol',
    description:
      'Precision facial harmony analysis and looksmaxxing protocol built for Indians.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="scanline-bg min-h-screen text-[#0a0a0a] antialiased selection:bg-[#0a0a0a] selection:text-[#e6e6e3]">
        {children}
      </body>
    </html>
  );
}

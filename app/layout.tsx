import type { Metadata } from 'next';
import { DM_Sans, Pixelify_Sans } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-sans',
});

const designSocietyFont = Pixelify_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-design-society',
});

const siteUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://darktriad.in'
).replace(/\/+$/, '');

const SEO_TITLE = 'Dark Triad AI — Facial Ratings, Analysis & Harmony India';
const SEO_DESCRIPTION =
  'Dark Triad AI delivers strict facial ratings, anatomical landmark analysis, jawline proportions, and Indian looksmaxxing protocols.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SEO_TITLE,
    template: '%s | Dark Triad AI',
  },
  description: SEO_DESCRIPTION,
  applicationName: 'Dark Triad AI',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  keywords: [
    'Dark Triad',
    'Dark Triad AI',
    'Dark Triad India',
    'Dark Triad Facial Ratings',
    'Dark Triad Facial Analysis',
    'facial analysis',
    'facial AI',
    'facial ratings AI',
    'PSL facial rating',
    'jawline analysis India',
    'facial harmony score',
    'looksmaxxing India',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: siteUrl,
    siteName: 'Dark Triad AI',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Dark Triad AI',
  alternateName: ['Dark Triad', 'Dark Triad India', 'Dark Triad Facial Analysis'],
  url: siteUrl,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'All',
  inLanguage: 'en-IN',
  description: SEO_DESCRIPTION,
  featureList: [
    'Front and side profile facial landmark mapping',
    'Strict PSL facial rating and symmetry breakdown',
    'Facial thirds, cheekbone, lip, nose, and jawline ratios',
    'Personalized Indian skincare, nutrition, training, and hairstyle plan',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${designSocietyFont.variable}`}>
      <body className="scanline-bg min-h-screen text-[#0a0a0a] antialiased selection:bg-[#0a0a0a] selection:text-[#e6e6e3]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {children}
      </body>
    </html>
  );
}

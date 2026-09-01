import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Comptoir des Chatonniers',
  description:
    "Coffrets cadeaux gourmands composés à partir de producteurs normands et français. " +
    "Vous donnez un budget, nous composons le coffret.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

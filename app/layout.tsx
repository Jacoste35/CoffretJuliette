import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque, Source_Serif_4 } from 'next/font/google';
import './globals.css';

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif-var',
  display: 'swap',
});

const sans = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans-var',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coffret-juliette.vercel.app'),
  title: {
    default: 'Comptoir des Chatonniers — coffrets & paniers garnis de Normandie',
    template: '%s — Comptoir des Chatonniers',
  },
  description:
    'Coffrets gourmands et paniers garnis composés de produits normands, pour les particuliers et les entreprises. Traçabilité complète, producteur identifié pour chaque produit.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Comptoir des Chatonniers — coffrets & paniers garnis de Normandie',
    description:
      'Coffrets gourmands composés de produits normands. Trois propositions adaptées à votre budget en moins d’une minute.',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="sans-impression border-b border-or/25 bg-creme-light">
          <div className="container flex items-center justify-between gap-4 py-4">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="font-serif text-xl font-semibold text-bordeaux">
                Comptoir des Chatonniers
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.2em] text-or sm:inline">
                coffrets &amp; paniers garnis
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/catalogue" className="hover:text-bordeaux">
                Le catalogue
              </Link>
              <Link href="/nos-producteurs" className="hidden hover:text-bordeaux sm:inline">
                Nos producteurs
              </Link>
              <Link
                href="/admin"
                className="rounded border border-or/40 px-3 py-1 text-xs uppercase tracking-wider text-or-dark hover:bg-or/10"
              >
                Back-office
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="sans-impression mt-16 border-t border-or/25 bg-sapin text-creme">
          <div className="container grid gap-8 py-10 text-sm md:grid-cols-3">
            <div>
              <p className="font-serif text-lg">Comptoir des Chatonniers</p>
              <p className="mt-2 text-creme/70">
                Coffrets cadeaux gourmands composés de produits de producteurs normands et
                français.
              </p>
            </div>
            <div>
              <p className="font-medium">Notre engagement</p>
              <p className="mt-2 text-creme/70">
                Chaque produit porte le nom de son producteur, sa commune et son département.
                Aucune origine n&apos;est affirmée sans preuve.
              </p>
            </div>
            <div>
              <p className="font-medium">Version</p>
              <p className="mt-2 text-creme/70">
                Préversion — parcours client, moteur de composition et devis. Prix en cours de
                validation : les montants affichés ne constituent pas une offre. Paiement et
                suivi de colis à venir.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

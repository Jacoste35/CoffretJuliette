const ETAPES = [
  { titre: 'Votre budget', texte: 'Un montant par coffret, un nombre de coffrets.' },
  { titre: 'Vos préférences', texte: 'Avec ou sans alcool, normand, français, bio, premium.' },
  { titre: 'Nos propositions', texte: 'Plusieurs compositions qui utilisent votre budget au plus près.' },
  { titre: 'Votre devis', texte: 'Généré et envoyé automatiquement, acceptable en ligne.' },
];

export default function Accueil() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-between px-6 py-12 sm:px-10 sm:py-16">
      <header>
        <p className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.18em] text-ink-3 uppercase">
          Normandie
        </p>
      </header>

      <section className="py-16">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,7vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
          Comptoir
          <br />
          des Chatonniers
        </h1>

        <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-2 sm:text-xl">
          Coffrets cadeaux gourmands composés à partir de producteurs normands et
          français. Vous donnez un budget, nous composons le coffret.
        </p>

        <p className="mt-10 inline-flex items-center gap-3 rounded-sm border border-rule bg-surface px-4 py-2.5 font-[family-name:var(--font-display)] text-sm font-medium">
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full bg-accent"
          />
          Site en cours de construction
        </p>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-sm border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {ETAPES.map((etape, i) => (
            <li key={etape.titre} className="bg-surface p-5">
              <span className="font-[family-name:var(--font-display)] text-xs font-bold tracking-[0.1em] text-accent tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-base font-bold tracking-[-0.01em]">
                {etape.titre}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-rule pt-6 font-[family-name:var(--font-display)] text-sm text-ink-3">
        <p>
          Entreprises et particuliers — cadeaux clients, CSE, séminaires, fêtes de fin
          d&apos;année.
        </p>
      </footer>
    </main>
  );
}

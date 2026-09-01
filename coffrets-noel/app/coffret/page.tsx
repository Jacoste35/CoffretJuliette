import type { Metadata } from "next";
import Link from "next/link";
import { alternativesPour } from "@/lib/engine";
import { produitsExtras } from "@/lib/catalogue";
import {
  ecrireBesoin,
  ecrireRemplacements,
  lireBesoin,
  lireExtras,
  lireRemplacements,
  propositionChoisie,
} from "@/lib/selection";
import { euros, poids } from "@/lib/format";
import { ProduitLigne } from "@/components/produit-carte";
import type { Gamme } from "@/lib/types";

export const metadata: Metadata = { title: "Votre coffret" };

export default function Coffret({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const besoin = lireBesoin(searchParams);
  const gamme = ((searchParams.g as Gamme) ?? "SIGNATURE") as Gamme;
  const remplacements = lireRemplacements(searchParams);
  const extras = lireExtras(searchParams);
  const proposition = propositionChoisie(besoin, gamme, remplacements);

  const base = ecrireBesoin(besoin);
  base.set("g", gamme);
  const sw = ecrireRemplacements(remplacements);
  if (sw) base.set("sw", sw);
  if (extras.length) base.set("x", extras.map((e) => e.id).join(","));

  const idsPresents = proposition.produits.map((p) => p.id);
  const suggestions = produitsExtras()
    .filter((p) => !idsPresents.includes(p.id) && !extras.some((e) => e.id === p.id))
    .filter((p) => (besoin.alcool === "SANS" ? p.alcool === "NON" : true))
    .sort((a, b) => b.noblesse - a.noblesse || a.prixVenteHt - b.prixVenteHt)
    .slice(0, 6);

  const lienAvecExtra = (id: string) => {
    const sp = new URLSearchParams(base);
    sp.set("x", [...extras.map((e) => e.id), id].join(","));
    return `/coffret?${sp.toString()}`;
  };
  const lienSansExtra = (id: string) => {
    const sp = new URLSearchParams(base);
    const restants = extras.filter((e) => e.id !== id).map((e) => e.id);
    if (restants.length) sp.set("x", restants.join(","));
    else sp.delete("x");
    return `/coffret?${sp.toString()}`;
  };

  const totalExtras = extras.reduce((s, p) => s + p.prixVenteHt, 0);
  const totalHt = proposition.chiffrage.prixCoffretHt + totalExtras;

  return (
    <div className="container grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
      <div>
        <Link href={`/propositions?${ecrireBesoin(besoin).toString()}`} className="text-sm text-chocolat-light hover:text-bordeaux">
          ← Revenir aux trois propositions
        </Link>

        <h1 className="mt-4 text-3xl text-bordeaux">Coffret {proposition.libelle}</h1>
        <p className="mt-2 text-chocolat-light">{proposition.accroche}</p>

        <section className="mt-8">
          <h2 className="text-lg text-bordeaux">Composition</h2>
          <ul className="mt-2">
            {proposition.produits.map((produit) => {
              const alternatives = alternativesPour(produit, besoin, idsPresents);
              return (
                <ProduitLigne
                  key={produit.id}
                  produit={produit}
                  action={
                    alternatives.length ? (
                      <details className="text-right">
                        <summary className="cursor-pointer text-xs text-or-dark hover:underline">
                          Remplacer
                        </summary>
                        <ul className="mt-2 w-64 space-y-1 rounded border border-or/30 bg-creme p-2 text-left">
                          {alternatives.map((alt) => {
                            const sp = new URLSearchParams(base);
                            const nouveaux = {
                              ...remplacements,
                              [Object.keys(remplacements).find(
                                (k) => remplacements[k] === produit.id,
                              ) ?? produit.id]: alt.id,
                            };
                            sp.set("sw", ecrireRemplacements(nouveaux));
                            return (
                              <li key={alt.id}>
                                <Link
                                  href={`/coffret?${sp.toString()}`}
                                  className="block rounded px-2 py-1 text-xs hover:bg-or/10"
                                >
                                  <span className="block text-chocolat">{alt.nom}</span>
                                  <span className="text-chocolat-light">
                                    {euros(alt.prixVenteHt)} HT · {alt.producteur}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    ) : null
                  }
                />
              );
            })}
          </ul>
        </section>

        {extras.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg text-bordeaux">Vos ajouts</h2>
            <ul className="mt-2">
              {extras.map((produit) => (
                <ProduitLigne
                  key={produit.id}
                  produit={produit}
                  action={
                    <Link
                      href={lienSansExtra(produit.id)}
                      className="text-xs text-chocolat-light hover:text-bordeaux hover:underline"
                    >
                      Retirer
                    </Link>
                  }
                />
              ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg text-bordeaux">Vous pouvez également ajouter</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {suggestions.map((produit) => (
              <Link
                key={produit.id}
                href={lienAvecExtra(produit.id)}
                className="carte flex items-start justify-between gap-3 p-4 transition hover:shadow-releve"
              >
                <span>
                  <span className="block text-sm font-medium text-chocolat">{produit.nom}</span>
                  <span className="mt-0.5 block text-xs text-chocolat-light">
                    {produit.producteur} · {produit.producteurVille}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-or-dark">
                  + {euros(produit.prixVenteHt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="carte p-6">
          <h2 className="font-serif text-lg text-bordeaux">Votre coffret</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Ligne libelle="Produits" valeur={euros(proposition.chiffrage.prixProduitsHt)} />
            <Ligne libelle="Emballage" valeur={euros(proposition.chiffrage.prixEmballageHt)} />
            {extras.length > 0 && <Ligne libelle="Ajouts" valeur={euros(totalExtras)} />}
            <div className="border-t border-or/25 pt-2">
              <Ligne libelle="Total par coffret HT" valeur={euros(totalHt)} fort />
            </div>
            <Ligne
              libelle={`× ${besoin.quantite} coffret${besoin.quantite > 1 ? "s" : ""}`}
              valeur={euros(totalHt * besoin.quantite)}
              fort
            />
          </dl>

          <p className="mt-4 text-xs text-chocolat-light">
            Poids estimé : {poids(proposition.poidsCoffretG)} par coffret ·{" "}
            {proposition.nbProduitsFragiles} produit
            {proposition.nbProduitsFragiles > 1 ? "s" : ""} fragile
            {proposition.nbProduitsFragiles > 1 ? "s" : ""} à protéger. Transport calculé
            à l&apos;étape suivante.
          </p>

          <Link
            href={`/recapitulatif?${base.toString()}`}
            className="mt-6 block rounded-full bg-bordeaux px-5 py-3 text-center text-sm font-medium text-creme hover:bg-bordeaux-dark"
          >
            Voir mon récapitulatif
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={fort ? "font-medium text-chocolat" : "text-chocolat-light"}>{libelle}</dt>
      <dd className={fort ? "font-medium text-bordeaux" : "text-chocolat"}>{valeur}</dd>
    </div>
  );
}

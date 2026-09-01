import type { Metadata } from "next";
import Link from "next/link";
import { construirePropositions } from "@/lib/engine";
import { ecrireBesoin, lireBesoin } from "@/lib/selection";
import { euros } from "@/lib/format";
import { EtiquetteAlcool } from "@/components/produit-carte";

export const metadata: Metadata = { title: "Vos trois propositions" };

export default function Propositions({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const besoin = lireBesoin(searchParams);
  const propositions = construirePropositions(besoin);
  const params = ecrireBesoin(besoin).toString();

  return (
    <div className="container py-12">
      <Link href={`/questionnaire?t=${besoin.typeClient === "PROFESSIONNEL" ? "pro" : "part"}`} className="text-sm text-chocolat-light hover:text-bordeaux">
        ← Modifier mes réponses
      </Link>

      <h1 className="mt-4 text-3xl text-bordeaux">Trois coffrets pour vous</h1>
      <p className="mt-2 max-w-2xl text-chocolat-light">
        Budget annoncé : <strong>{euros(besoin.budget)} HT</strong> par coffret ·{" "}
        {besoin.quantite} coffret{besoin.quantite > 1 && "s"}
        {besoin.alcool === "SANS" && " · sans alcool"}
        {besoin.alcool === "AVEC" && " · avec alcool"}
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {propositions.map((proposition) => {
          const recommande = proposition.gamme === "SIGNATURE";
          const vide = proposition.produits.length === 0;
          return (
            <article
              key={proposition.gamme}
              className={`relative flex flex-col rounded-lg border bg-creme-light p-6 ${
                recommande
                  ? "border-bordeaux shadow-releve lg:-mt-3 lg:mb-3"
                  : "border-or/25 shadow-carte"
              }`}
            >
              {recommande && (
                <span className="absolute -top-3 left-6 rounded-full bg-bordeaux px-3 py-1 text-[11px] uppercase tracking-widest text-creme">
                  Le plus choisi
                </span>
              )}

              <h2 className="text-2xl text-bordeaux">{proposition.libelle}</h2>
              <p className="mt-1 text-sm text-chocolat-light">{proposition.accroche}</p>

              {vide ? (
                <p className="mt-6 rounded border border-or/30 bg-or/5 p-4 text-sm text-chocolat-light">
                  Aucune composition ne respecte ces critères à ce budget. Essayez un
                  budget légèrement supérieur ou élargissez vos préférences.
                </p>
              ) : (
                <>
                  <p className="mt-5 text-3xl font-medium text-bordeaux">
                    {euros(proposition.chiffrage.prixCoffretHt)}
                    <span className="ml-1 text-sm font-normal text-chocolat-light">HT</span>
                  </p>
                  <p className="text-sm text-chocolat-light">
                    soit {euros(proposition.chiffrage.prixCoffretTtc)} TTC · emballage inclus
                  </p>
                  {proposition.ecartBudget > 0 ? (
                    <p className="mt-1 text-xs text-or-dark">
                      +{euros(proposition.ecartBudget)} au-dessus de votre budget
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-sapin">
                      {euros(-proposition.ecartBudget)} sous votre budget
                    </p>
                  )}

                  <ul className="mt-5 space-y-2 border-t border-or/20 pt-5 text-sm">
                    {proposition.produits.map((p) => (
                      <li key={p.id} className="flex items-start justify-between gap-3">
                        <span>
                          <span className="text-chocolat">{p.nom}</span>
                          <span className="block text-xs text-chocolat-light">
                            {p.producteur}
                          </span>
                        </span>
                        <EtiquetteAlcool produit={p} />
                      </li>
                    ))}
                  </ul>

                  <ul className="mt-5 space-y-1 text-xs text-chocolat-light">
                    {proposition.argumentaire.map((a) => (
                      <li key={a}>· {a}</li>
                    ))}
                  </ul>

                  {proposition.limiteBudget && (
                    <p className="mt-4 rounded border border-or/40 bg-or/5 p-3 text-xs text-chocolat-light">
                      À ce budget nous ne pouvons pas aller au-delà de{" "}
                      {proposition.produits.length} produits. À partir de{" "}
                      <strong className="text-or-dark">
                        {euros(proposition.limiteBudget.budgetConseille)} HT
                      </strong>
                      , nous en ajoutons {proposition.limiteBudget.produitsManquants}.
                    </p>
                  )}

                  <Link
                    href={`/coffret?${params}&g=${proposition.gamme}`}
                    className={`mt-6 block rounded-full px-5 py-2.5 text-center text-sm font-medium transition ${
                      recommande
                        ? "bg-bordeaux text-creme hover:bg-bordeaux-dark"
                        : "border border-bordeaux text-bordeaux hover:bg-bordeaux/5"
                    }`}
                  >
                    Choisir ce coffret
                  </Link>
                </>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-chocolat-light">
        Les prix produits sont calculés à partir des tarifs d&apos;achat réels de nos
        fournisseurs. Les coûts d&apos;emballage, de préparation et de transport sont
        pour l&apos;instant des hypothèses de travail, signalées comme telles dans le
        récapitulatif.
      </p>
    </div>
  );
}

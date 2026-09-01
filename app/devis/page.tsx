import type { Metadata } from "next";
import Link from "next/link";
import { construireDevis, numeroDevis } from "@/lib/engine";
import {
  ecrireBesoin,
  ecrireRemplacements,
  lireBesoin,
  lireExtras,
  lireRemplacements,
  propositionChoisie,
} from "@/lib/selection";
import { euros } from "@/lib/format";
import BoutonImpression from "@/components/bouton-impression";
import type { Gamme } from "@/lib/types";

export const metadata: Metadata = { title: "Votre devis", robots: { index: false } };

export default async function PageDevis(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const besoin = lireBesoin(searchParams);
  const gamme = ((searchParams.g as Gamme) ?? "SIGNATURE") as Gamme;
  const proposition = propositionChoisie(besoin, gamme, lireRemplacements(searchParams));
  const extras = lireExtras(searchParams);
  const devis = construireDevis(besoin, proposition, extras, numeroDevis(besoin, gamme));

  const params = ecrireBesoin(besoin);
  params.set("g", gamme);
  const sw = ecrireRemplacements(lireRemplacements(searchParams));
  if (sw) params.set("sw", sw);
  if (extras.length) params.set("x", extras.map((e) => e.id).join(","));

  const dateJour = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="container max-w-4xl py-12">
      <div className="sans-impression mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/recapitulatif?${params.toString()}`} className="text-sm text-chocolat-light hover:text-bordeaux">
          ← Modifier
        </Link>
        <p className="text-xs text-chocolat-light">
          Conservez ce lien : il rouvre votre devis à l&apos;identique.
        </p>
      </div>

      <article className="carte p-8 print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-or/25 pb-6">
          <div>
            <p className="font-serif text-2xl text-bordeaux">Comptoir des Chatonniers</p>
            <p className="mt-1 text-sm text-chocolat-light">
              Coffrets &amp; paniers garnis
              <br />
              Coordonnées de facturation : à compléter
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-chocolat">Devis n° {devis.numero}</p>
            <p className="text-chocolat-light">Émis le {dateJour}</p>
            <p className="text-chocolat-light">Valable 30 jours</p>
          </div>
        </header>

        <section className="grid gap-6 border-b border-or/25 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-chocolat-light">Client</p>
            <p className="mt-1 font-medium text-chocolat">
              {besoin.societe || (besoin.typeClient === "PROFESSIONNEL" ? "Entreprise" : "Particulier")}
            </p>
            {besoin.contact && <p className="text-chocolat-light">{besoin.contact}</p>}
            {besoin.email && <p className="text-chocolat-light">{besoin.email}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-chocolat-light">Commande</p>
            <p className="mt-1 text-chocolat-light">
              {besoin.quantite} coffret{besoin.quantite > 1 && "s"} « {proposition.libelle} »
              <br />
              {devis.nbColis} colis · {devis.poidsTotalKg} kg au total
            </p>
          </div>
        </section>

        <table className="mt-6 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-chocolat-light">
            <tr className="border-b border-or/25">
              <th className="pb-2">Désignation</th>
              <th className="pb-2 text-right">Qté</th>
              <th className="pb-2 text-right">P.U. HT</th>
              <th className="pb-2 text-right">TVA</th>
              <th className="pb-2 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {devis.lignes.map((ligne, i) => (
              <tr key={`${ligne.libelle}-${i}`} className="border-b border-or/15 align-top">
                <td className="py-3">
                  <span className="font-medium text-chocolat">{ligne.libelle}</span>
                  <span className="mt-0.5 block text-xs text-chocolat-light">{ligne.detail}</span>
                </td>
                <td className="py-3 text-right">{ligne.quantite}</td>
                <td className="py-3 text-right">{euros(ligne.prixUnitaireHt)}</td>
                <td className="py-3 text-right">{(ligne.tva * 100).toFixed(1)} %</td>
                <td className="py-3 text-right font-medium">{euros(ligne.totalHt)}</td>
              </tr>
            ))}
            <tr className="border-b border-or/15">
              <td className="py-3" colSpan={4}>
                <span className="font-medium text-chocolat">Transport</span>
                <span className="mt-0.5 block text-xs text-chocolat-light">
                  {devis.nbColis} colis — refacturé au coût
                </span>
              </td>
              <td className="py-3 text-right font-medium">{euros(devis.transportHt)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            {devis.totalRemise > 0 && (
              <Ligne libelle="Remise" valeur={`− ${euros(devis.totalRemise)}`} />
            )}
            <Ligne libelle="Total HT" valeur={euros(devis.totalHt)} />
            <Ligne libelle="TVA" valeur={euros(devis.totalTva)} />
            <div className="border-t border-or/25 pt-2">
              <Ligne libelle="Total TTC" valeur={euros(devis.totalTtc)} fort />
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-t border-or/25 pt-6 text-xs leading-relaxed text-chocolat-light">
          <p>
            Conditions de règlement : à définir. Devis valable 30 jours à compter de sa
            date d&apos;émission.
          </p>
          <p className="mt-2">
            Les prix des produits proviennent des tarifs fournisseurs 2026. Les coûts
            d&apos;emballage, de préparation et de transport sont des hypothèses de
            travail tant que les tarifs réels ne sont pas renseignés.
          </p>
        </footer>
      </article>

      <div className="sans-impression mt-8 space-y-4">
        <div className="flex flex-wrap gap-3">
          <BoutonImpression />
          <Link
            href="/"
            className="rounded-full border border-bordeaux px-6 py-2.5 text-sm font-medium text-bordeaux hover:bg-bordeaux/5"
          >
            Nouveau projet
          </Link>
        </div>
        <p className="rounded border border-or/40 bg-or/5 p-4 text-xs leading-relaxed text-chocolat-light">
          <strong className="text-or-dark">Étapes suivantes non développées en V1 :</strong>{" "}
          acceptation en ligne, signature électronique, paiement Stripe, numéro de
          commande et suivi de colis. L&apos;architecture les prévoit — elles nécessitent
          un compte prestataire et une base de données.
        </p>
      </div>
    </div>
  );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={fort ? "font-medium text-chocolat" : "text-chocolat-light"}>{libelle}</dt>
      <dd className={fort ? "text-lg font-medium text-bordeaux" : "text-chocolat"}>{valeur}</dd>
    </div>
  );
}

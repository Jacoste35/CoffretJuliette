import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlternatives, getProduit, getProduits } from "@/lib/catalogue";
import { contenance, euros, libelleCategorie, poids } from "@/lib/format";
import { EtiquetteAlcool } from "@/components/produit-carte";

export function generateStaticParams() {
  return getProduits().map((p) => ({ id: p.id }));
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const produit = getProduit(params.id);
  if (!produit) return { title: "Produit introuvable" };
  return {
    title: produit.nom,
    description: `${produit.nom} — ${produit.producteur}, ${produit.producteurVille} (${produit.departement}).`,
    openGraph: { title: produit.nom, description: `${produit.producteur} · ${produit.producteurVille}` },
  };
}

export default async function FicheProduit(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const produit = getProduit(params.id);
  if (!produit) notFound();

  const alternatives = getAlternatives(produit.id).slice(0, 4);
  const memeProducteur = getProduits()
    .filter((p) => p.producteur === produit.producteur && p.id !== produit.id)
    .slice(0, 4);

  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: produit.nom,
    category: libelleCategorie(produit.categorie),
    brand: { "@type": "Brand", name: produit.producteur },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: produit.prixVenteHt,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="container max-w-4xl py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donneesStructurees) }}
      />

      <Link href="/catalogue" className="text-sm text-chocolat-light hover:text-bordeaux">
        ← Retour au catalogue
      </Link>

      <p className="mt-5 text-xs uppercase tracking-[0.2em] text-or-dark">
        {libelleCategorie(produit.categorie)}
      </p>
      <h1 className="mt-2 text-3xl leading-tight text-bordeaux">{produit.nom}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EtiquetteAlcool produit={produit} />
        {contenance(produit) && (
          <span className="etiquette border-or/30 bg-creme text-chocolat-light">
            {contenance(produit)}
          </span>
        )}
        {produit.appellation && (
          <span className="etiquette border-or/50 bg-or/10 text-or-dark">{produit.appellation}</span>
        )}
        {produit.produitNoel && (
          <span className="etiquette border-sapin/30 bg-sapin/10 text-sapin">Sélection de Noël</span>
        )}
      </div>

      <p className="mt-6 text-3xl font-medium text-bordeaux">
        {euros(produit.prixVenteHt)}
        <span className="ml-1 text-sm font-normal text-chocolat-light">HT</span>
        {produit.tvaConfirmee && (
          <span className="ml-3 text-base font-normal text-chocolat-light">
            {euros(produit.prixVenteHt * (1 + produit.tva))} TTC
          </span>
        )}
      </p>
      {!produit.tvaConfirmee && (
        <p className="mt-1 text-xs text-or-dark">
          Taux de TVA non documenté dans le tarif fournisseur — à confirmer.
        </p>
      )}

      {produit.description && (
        <p className="mt-5 max-w-2xl leading-relaxed text-chocolat-light">{produit.description}</p>
      )}

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="carte p-5">
          <h2 className="font-serif text-lg text-bordeaux">Provenance</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Ligne libelle="Producteur" valeur={produit.producteur} />
            {produit.producteurVille && <Ligne libelle="Commune" valeur={produit.producteurVille} />}
            <Ligne libelle="Département" valeur={produit.departement} />
            <Ligne libelle="Région" valeur={produit.region} />
            {produit.appellation && <Ligne libelle="Appellation" valeur={produit.appellation} />}
          </dl>
          {produit.alerteMatierePremiere && (
            <p className="mt-4 rounded border border-or/40 bg-or/5 p-3 text-xs leading-relaxed text-chocolat-light">
              Fabriqué en Normandie, mais la matière première principale n&apos;est pas
              française. Nous ne le présentons donc pas comme un produit 100 % local.
            </p>
          )}
        </div>

        <div className="carte p-5">
          <h2 className="font-serif text-lg text-bordeaux">Caractéristiques</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {produit.poidsNetG && <Ligne libelle="Poids net" valeur={poids(produit.poidsNetG)} />}
            {produit.volumeMl && <Ligne libelle="Contenance" valeur={contenance(produit)} />}
            {produit.conditionnement && (
              <Ligne libelle="Conditionnement" valeur={produit.conditionnement} />
            )}
            {produit.degreAlcool && !produit.degreAlcool.startsWith("À") && (
              <Ligne libelle="Degré" valeur={produit.degreAlcool} />
            )}
            {produit.contientVerre && <Ligne libelle="Contenant" valeur="Verre — protégé à l'expédition" />}
            {produit.delaiFournisseur && (
              <Ligne libelle="Délai producteur" valeur={produit.delaiFournisseur} />
            )}
          </dl>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/questionnaire?t=part"
          className="rounded-full bg-bordeaux px-6 py-2.5 text-sm font-medium text-creme hover:bg-bordeaux-dark"
        >
          Composer un coffret
        </Link>
        <Link
          href={`/catalogue?prod=${encodeURIComponent(produit.producteur)}`}
          className="rounded-full border border-bordeaux px-6 py-2.5 text-sm font-medium text-bordeaux hover:bg-bordeaux/5"
        >
          Voir ce producteur
        </Link>
      </div>

      {memeProducteur.length > 0 && (
        <Rangee titre={`Autres produits de ${produit.producteur}`} produits={memeProducteur} />
      )}
      {alternatives.length > 0 && (
        <Rangee titre="Dans le même esprit" produits={alternatives} />
      )}

      <p className="mt-12 border-t border-or/20 pt-5 text-xs leading-relaxed text-chocolat-light">
        Source du tarif : {produit.source}. Prix de vente proposé à partir du prix
        d&apos;achat fournisseur, en attente de validation commerciale.
      </p>
    </div>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-chocolat-light">{libelle}</dt>
      <dd className="text-right text-chocolat">{valeur}</dd>
    </div>
  );
}

function Rangee({ titre, produits }: { titre: string; produits: ReturnType<typeof getProduits> }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-lg text-bordeaux">{titre}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {produits.map((p) => (
          <li key={p.id}>
            <Link href={`/produit/${p.id}`} className="carte block h-full p-4 transition hover:shadow-releve">
              <p className="text-sm font-medium leading-snug text-chocolat">{p.nom}</p>
              <p className="mt-1 text-xs text-chocolat-light">{p.producteur}</p>
              <p className="mt-2 text-sm font-medium text-bordeaux">{euros(p.prixVenteHt)} HT</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

import type { Metadata } from "next";
import { getProducteurs, getProduits } from "@/lib/catalogue";

export const metadata: Metadata = {
  title: "Nos producteurs",
  description:
    "Les producteurs normands dont nous sélectionnons les produits : commune, département, nombre de références.",
};

export default function NosProducteurs() {
  const producteurs = getProducteurs();
  const produits = getProduits();

  const parDepartement = producteurs.reduce<Record<string, number>>((acc, p) => {
    const cle = p.departement || "À confirmer";
    acc[cle] = (acc[cle] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container py-12">
      <h1 className="text-3xl text-bordeaux">Nos producteurs</h1>
      <p className="mt-3 max-w-3xl text-chocolat-light">
        {producteurs.length} producteurs, {produits.length} références. Pour chaque
        produit nous conservons son producteur, sa commune et son département, ainsi que
        le document commercial dont provient chaque prix.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(parDepartement)
          .sort((a, b) => b[1] - a[1])
          .map(([departement, nb]) => (
            <span
              key={departement}
              className="etiquette border-or/40 bg-or/10 text-or-dark"
            >
              {departement} · {nb} producteur{nb > 1 ? "s" : ""}
            </span>
          ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {producteurs.map((producteur) => (
          <article key={producteur.id} className="carte p-5">
            <h2 className="text-lg text-bordeaux">{producteur.nom}</h2>
            <p className="mt-1 text-sm text-chocolat-light">
              {producteur.codePostal} {producteur.ville}
              {producteur.departement && ` · ${producteur.departement}`}
            </p>
            <p className="mt-3 text-sm text-chocolat">
              {producteur.nbProduits} référence{producteur.nbProduits > 1 ? "s" : ""}
            </p>
            {producteur.siteInternet && (
              <a
                href={producteur.siteInternet}
                target="_blank"
                rel="noreferrer noopener"
                className="lien-sobre mt-2 inline-block text-sm text-or-dark"
              >
                Site du producteur
              </a>
            )}
          </article>
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-chocolat-light">
        Certains produits sont fabriqués en Normandie à partir de matières premières qui
        ne le sont pas — café, thé, cacao, fruits exotiques. Nous le signalons sur la
        fiche produit plutôt que de les présenter comme entièrement locaux.
      </p>
    </div>
  );
}

import { contenance, euros } from "@/lib/format";
import type { Produit } from "@/lib/types";

export function EtiquetteAlcool({ produit }: { produit: Produit }) {
  if (produit.alcool === "OUI") {
    // Le degré n'est pas documenté pour tous les produits : on n'affiche
    // pas « À CONFIRMER » au client, on omet simplement la mention.
    const degre =
      produit.degreAlcool && !produit.degreAlcool.startsWith("À") ? produit.degreAlcool : "";
    return (
      <span className="etiquette border-bordeaux/30 bg-bordeaux/10 text-bordeaux">
        Alcool{degre && ` · ${degre}`}
      </span>
    );
  }
  if (produit.alcool === "INGREDIENT_ALCOOLISE") {
    return (
      <span className="etiquette border-or/40 bg-or/10 text-or-dark">
        Alcool en ingrédient
      </span>
    );
  }
  return (
    <span className="etiquette border-sapin/30 bg-sapin/10 text-sapin">Sans alcool</span>
  );
}

export function ProduitLigne({
  produit,
  action,
}: {
  produit: Produit;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-or/20 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-chocolat">{produit.nom}</p>
        <p className="mt-0.5 text-sm text-chocolat-light">
          {produit.producteur}
          {produit.producteurVille && ` · ${produit.producteurVille}`}
          {produit.departement && ` (${produit.departement})`}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <EtiquetteAlcool produit={produit} />
          {contenance(produit) && (
            <span className="etiquette border-or/30 bg-creme text-chocolat-light">
              {contenance(produit)}
            </span>
          )}
          {produit.appellation && (
            <span className="etiquette border-or/50 bg-or/10 text-or-dark">
              {produit.appellation}
            </span>
          )}
        </div>
        {produit.alerteMatierePremiere && (
          <p className="mt-2 text-xs italic text-chocolat-light">
            Transformé en Normandie — matière première non française.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="font-medium text-bordeaux">{euros(produit.prixVenteHt)} HT</span>
        {action}
      </div>
    </li>
  );
}

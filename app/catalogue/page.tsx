import type { Metadata } from "next";
import Link from "next/link";
import { facettes, filtrer, lireFiltres, PAR_PAGE } from "@/lib/recherche";
import { contenance, euros, libelleCategorie } from "@/lib/format";
import { EtiquetteAlcool } from "@/components/produit-carte";

export const metadata: Metadata = {
  title: "Le catalogue",
  description:
    "Tous les produits de nos producteurs normands : biscuiterie, épicerie, traiteur, cidres, calvados, bien-être. Producteur, commune et département affichés pour chaque référence.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function Catalogue(props: { searchParams: Promise<Params> }) {
  const searchParams = await props.searchParams;
  const filtres = lireFiltres(searchParams);
  const { produits, total, page, pages } = filtrer(filtres);
  const { categories, departements, producteurs } = facettes();

  const lienPage = (n: number) => {
    const sp = new URLSearchParams();
    if (filtres.q) sp.set("q", filtres.q);
    if (filtres.categorie) sp.set("c", filtres.categorie);
    if (filtres.alcool) sp.set("a", filtres.alcool);
    if (filtres.departement) sp.set("d", filtres.departement);
    if (filtres.producteur) sp.set("prod", filtres.producteur);
    if (filtres.tri !== "nom") sp.set("tri", filtres.tri);
    if (n > 1) sp.set("page", String(n));
    const s = sp.toString();
    return s ? `/catalogue?${s}` : "/catalogue";
  };

  const filtreActif =
    filtres.q || filtres.categorie || filtres.alcool || filtres.departement || filtres.producteur;

  return (
    <div className="container py-10">
      <h1 className="text-3xl text-bordeaux">Le catalogue</h1>
      <p className="mt-2 max-w-3xl text-chocolat-light">
        Toutes nos références, telles qu&apos;elles sortent de chez nos producteurs.
        Chaque fiche indique le producteur, sa commune et son département.
      </p>

      <form method="get" action="/catalogue" className="carte mt-6 grid gap-4 p-5 lg:grid-cols-5">
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wider text-chocolat-light">
            Rechercher
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filtres.q}
            placeholder="cidre, terrine, miel, Hérout…"
            className="w-full rounded border border-or/40 bg-creme-light px-3 py-2 outline-none focus:border-bordeaux"
          />
        </label>

        <Select nom="c" label="Catégorie" valeur={filtres.categorie} vide="Toutes"
          options={categories.map(([v, n]) => [v, `${libelleCategorie(v)} (${n})`])} />

        <Select nom="a" label="Alcool" valeur={filtres.alcool} vide="Peu importe"
          options={[
            ["SANS", "Sans alcool"],
            ["AVEC", "Avec alcool"],
            ["INGREDIENT", "Alcool en ingrédient"],
            ["LOCAL", "Matière première française"],
          ]} />

        <Select nom="d" label="Département" valeur={filtres.departement} vide="Tous"
          options={departements.map(([v, n]) => [v, `${v} (${n})`])} />

        <Select nom="prod" label="Producteur" valeur={filtres.producteur} vide="Tous"
          options={producteurs.map(([v, n]) => [v, `${v} (${n})`])} />

        <Select nom="tri" label="Trier par" valeur={filtres.tri} vide=""
          options={[
            ["nom", "Nom"],
            ["prix-croissant", "Prix croissant"],
            ["prix-decroissant", "Prix décroissant"],
            ["producteur", "Producteur"],
            ["noblesse", "Niveau de gamme"],
          ]} />

        <div className="flex items-end gap-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-full bg-bordeaux px-6 py-2 text-sm font-medium text-creme hover:bg-bordeaux-dark"
          >
            Filtrer
          </button>
          {filtreActif && (
            <Link
              href="/catalogue"
              className="rounded-full border border-or/40 px-5 py-2 text-sm text-chocolat-light hover:border-or"
            >
              Tout effacer
            </Link>
          )}
        </div>
      </form>

      <p className="mt-6 text-sm text-chocolat-light">
        <strong className="text-chocolat">{total}</strong> produit{total > 1 && "s"}
        {total > PAR_PAGE && ` · page ${page} sur ${pages}`}
      </p>

      {total === 0 ? (
        <p className="carte mt-6 p-8 text-center text-chocolat-light">
          Aucun produit ne correspond à ces critères.{" "}
          <Link href="/catalogue" className="lien-sobre text-bordeaux">
            Effacer les filtres
          </Link>
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {produits.map((p) => (
            <li key={p.id}>
              <Link
                href={`/produit/${p.id}`}
                className="carte flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-releve"
              >
                <p className="text-[11px] uppercase tracking-wider text-or-dark">
                  {libelleCategorie(p.categorie)}
                </p>
                <h2 className="mt-1 font-medium leading-snug text-chocolat">{p.nom}</h2>
                <p className="mt-1 text-sm text-chocolat-light">
                  {p.producteur}
                  {p.producteurVille && ` · ${p.producteurVille}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <EtiquetteAlcool produit={p} />
                  {contenance(p) && (
                    <span className="etiquette border-or/30 bg-creme text-chocolat-light">
                      {contenance(p)}
                    </span>
                  )}
                </div>
                <p className="mt-auto pt-4 font-medium text-bordeaux">
                  {euros(p.prixVenteHt)}{" "}
                  <span className="text-xs font-normal text-chocolat-light">HT</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={lienPage(page - 1)} className="rounded border border-or/40 px-3 py-1.5 hover:bg-or/10">
              ← Précédent
            </Link>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
            .map((n, i, arr) => (
              <span key={n} className="flex items-center gap-2">
                {i > 0 && arr[i - 1] !== n - 1 && <span className="text-chocolat-light">…</span>}
                <Link
                  href={lienPage(n)}
                  className={`rounded px-3 py-1.5 ${
                    n === page
                      ? "bg-bordeaux text-creme"
                      : "border border-or/40 hover:bg-or/10"
                  }`}
                >
                  {n}
                </Link>
              </span>
            ))}
          {page < pages && (
            <Link href={lienPage(page + 1)} className="rounded border border-or/40 px-3 py-1.5 hover:bg-or/10">
              Suivant →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Select({
  nom,
  label,
  valeur,
  vide,
  options,
}: {
  nom: string;
  label: string;
  valeur: string;
  vide: string;
  options: [string, string][];
}) {
  return (
    <label>
      <span className="mb-1 block text-xs uppercase tracking-wider text-chocolat-light">
        {label}
      </span>
      <select
        name={nom}
        defaultValue={valeur}
        className="w-full rounded border border-or/40 bg-creme-light px-3 py-2 outline-none focus:border-bordeaux"
      >
        {vide && <option value="">{vide}</option>}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

import type { Metadata } from "next";
import { getProduits, getProducteurs, getCatalogue } from "@/lib/catalogue";
import { euros, libelleCategorie, pourcent } from "@/lib/format";
import { EMBALLAGES, PREPARATION, REMISES_QUANTITE, STATUT_HYPOTHESE, TRANSPORT } from "@/lib/parametres";

export const metadata: Metadata = { title: "Back-office", robots: { index: false } };

export default function Admin() {
  const produits = getProduits();
  const producteurs = getProducteurs();
  const { remises } = getCatalogue();

  const marge = produits.reduce((s, p) => s + p.margeEur, 0) / produits.length;
  const parCategorie = produits.reduce<Record<string, { nb: number; marge: number }>>(
    (acc, p) => {
      const c = acc[p.categorie] ?? { nb: 0, marge: 0 };
      c.nb += 1;
      c.marge += p.tauxMarge;
      acc[p.categorie] = c;
      return acc;
    },
    {},
  );

  const forteMarge = [...produits].sort((a, b) => b.tauxMarge - a.tauxMarge).slice(0, 8);
  const lourdsFaibleMarge = [...produits]
    .filter((p) => (p.poidsNetG ?? 0) >= 700)
    .sort((a, b) => a.tauxMarge - b.tauxMarge)
    .slice(0, 8);

  return (
    <div className="container py-12">
      <p className="text-xs uppercase tracking-[0.28em] text-or-dark">Back-office</p>
      <h1 className="mt-2 text-3xl text-bordeaux">Pilotage du catalogue</h1>
      <p className="mt-2 max-w-3xl text-chocolat-light">
        Vue de lecture. En V1 les données proviennent du fichier catalogue généré depuis
        la base ; l&apos;édition passera par la base de données et une authentification
        administrateur.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile libelle="Produits vendables" valeur={String(produits.length)} />
        <Tuile libelle="Producteurs" valeur={String(producteurs.length)} />
        <Tuile libelle="Marge moyenne / produit" valeur={euros(marge)} />
        <Tuile
          libelle="Produits sans alcool"
          valeur={String(produits.filter((p) => p.alcool === "NON").length)}
        />
      </div>

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl text-bordeaux">Opportunités — forte marge</h2>
          <Tableau
            lignes={forteMarge.map((p) => [
              p.nom,
              p.producteur,
              euros(p.prixAchatHt),
              euros(p.prixVenteHt),
              pourcent(p.tauxMarge),
            ])}
            entetes={["Produit", "Producteur", "Achat", "Vente", "Marge"]}
          />
        </div>

        <div>
          <h2 className="font-serif text-xl text-bordeaux">
            À surveiller — lourds et peu margés
          </h2>
          <Tableau
            lignes={lourdsFaibleMarge.map((p) => [
              p.nom,
              `${Math.round((p.poidsNetG ?? 0) / 10) / 100} kg`,
              euros(p.prixAchatHt),
              euros(p.prixVenteHt),
              pourcent(p.tauxMarge),
            ])}
            entetes={["Produit", "Poids", "Achat", "Vente", "Marge"]}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-bordeaux">Répartition par catégorie</h2>
        <Tableau
          entetes={["Catégorie", "Produits", "Taux de marge moyen"]}
          lignes={Object.entries(parCategorie)
            .sort((a, b) => b[1].nb - a[1].nb)
            .map(([cat, v]) => [
              libelleCategorie(cat),
              String(v.nb),
              pourcent(v.marge / v.nb),
            ])}
        />
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-bordeaux">Remises documentées</h2>
        <p className="mt-1 text-sm text-chocolat-light">
          Reprises telles quelles des documents fournisseurs. Aucune remise n&apos;a été
          ajoutée.
        </p>
        <Tableau
          entetes={["Code", "Type", "Fournisseur", "Palier", "Remise"]}
          lignes={remises.map((r) => [r.code, r.type, r.fournisseur, r.palier, r.remise || "—"])}
        />
        {REMISES_QUANTITE.length === 0 && (
          <p className="mt-3 rounded border border-or/40 bg-or/5 p-4 text-xs text-chocolat-light">
            Aucune grille de remise par volume n&apos;est active. Pour en ajouter une,
            renseignez <code>REMISES_QUANTITE</code> dans <code>lib/parametres.ts</code> —
            elle s&apos;appliquera immédiatement au parcours client et au devis.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-bordeaux">Paramètres du moteur</h2>
        <p className="mt-1 text-sm font-medium text-or-dark">{STATUT_HYPOTHESE}</p>
        <Tableau
          entetes={["Paramètre", "Valeur", "Nature"]}
          lignes={[
            ...Object.entries(EMBALLAGES).map(([g, e]) => [
              `Emballage ${g}`,
              `achat ${euros(e.coutAchatHt)} · vendu ${euros(e.prixVenteHt)}`,
              "Hypothèse",
            ]),
            [
              "Préparation",
              `${PREPARATION.minutesParGamme.ESSENTIEL}/${PREPARATION.minutesParGamme.SIGNATURE}/${PREPARATION.minutesParGamme.PRESTIGE} min · ${euros(PREPARATION.tauxHoraireHt)}/h`,
              "Hypothèse",
            ],
            [
              "Transport",
              TRANSPORT.map((t) => `≤${t.poidsMaxKg}kg : ${euros(t.tarifHt)}`).join(" · "),
              "Hypothèse",
            ],
            [
              "Coefficients de prix de vente",
              "1,40 à 2,64 selon catégorie et palier de prix d'achat",
              "Proposition de marché — à valider",
            ],
          ]}
        />
      </section>
    </div>
  );
}

function Tuile({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="carte p-5">
      <p className="text-xs uppercase tracking-wider text-chocolat-light">{libelle}</p>
      <p className="mt-2 font-serif text-2xl text-bordeaux">{valeur}</p>
    </div>
  );
}

function Tableau({ entetes, lignes }: { entetes: string[]; lignes: string[][] }) {
  return (
    <div className="carte mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-creme-dark/50 text-left text-xs uppercase tracking-wider text-chocolat-light">
          <tr>
            {entetes.map((e) => (
              <th key={e} className="whitespace-nowrap p-3">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr key={i} className="border-t border-or/20">
              {ligne.map((cellule, j) => (
                <td key={j} className={`p-3 ${j === 0 ? "text-chocolat" : "text-chocolat-light"}`}>
                  {cellule}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

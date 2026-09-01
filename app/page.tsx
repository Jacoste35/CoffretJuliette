import Link from "next/link";
import { getProduits, getProducteurs } from "@/lib/catalogue";

export default function Accueil() {
  const produits = getProduits();
  const producteurs = getProducteurs();
  const sansAlcool = produits.filter((p) => p.alcool === "NON").length;

  return (
    <>
      <section className="border-b border-or/20 bg-gradient-to-b from-creme-light to-creme">
        <div className="container py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.28em] text-or-dark">
            Normandie · Calvados · Manche · Orne · Eure · Seine-Maritime
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight text-bordeaux md:text-5xl">
            Pour qui préparez-vous vos cadeaux&nbsp;?
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-chocolat-light">
            Répondez à quatre questions. Nous composons trois coffrets à partir de{" "}
            {produits.length} produits de {producteurs.length} producteurs normands, et
            vous obtenez votre prix immédiatement.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            <Link
              href="/questionnaire?t=part"
              className="group carte flex flex-col justify-between p-7 transition hover:-translate-y-0.5 hover:shadow-releve"
            >
              <div>
                <h2 className="text-2xl text-bordeaux">Je suis un particulier</h2>
                <p className="mt-2 text-sm text-chocolat-light">
                  Un cadeau, quelques coffrets, pour offrir à vos proches.
                </p>
              </div>
              <span className="mt-6 text-sm font-medium text-or-dark group-hover:underline">
                Composer mon coffret →
              </span>
            </Link>

            <Link
              href="/questionnaire?t=pro"
              className="group flex flex-col justify-between rounded-lg border border-bordeaux/30 bg-bordeaux p-7 text-creme shadow-carte transition hover:-translate-y-0.5 hover:shadow-releve"
            >
              <div>
                <h2 className="text-2xl">Je suis une entreprise</h2>
                <p className="mt-2 text-sm text-creme/80">
                  Cadeaux clients ou salariés, devis immédiat, livraison groupée
                  ou multi-adresses.
                </p>
              </div>
              <span className="mt-6 text-sm font-medium text-or-light group-hover:underline">
                Obtenir mon devis →
              </span>
            </Link>
          </div>

          <p className="mt-6 text-sm text-chocolat-light">
            Vous préférez regarder d&apos;abord&nbsp;?{" "}
            <Link href="/catalogue" className="lien-sobre text-bordeaux">
              Parcourir les {produits.length} produits du catalogue
            </Link>
          </p>
        </div>
      </section>

      <section className="container grid gap-8 py-14 md:grid-cols-3">
        {[
          {
            titre: "Producteur identifié",
            texte:
              "Pour chaque produit : le producteur, sa commune, son département. La provenance est affichée telle qu'elle est documentée, jamais devinée.",
            chiffre: `${producteurs.length} producteurs`,
          },
          {
            titre: "Sans alcool possible",
            texte:
              "Un filtre strict : les coffrets sans alcool excluent aussi les produits dont l'alcool n'est qu'un ingrédient.",
            chiffre: `${sansAlcool} produits sans alcool`,
          },
          {
            titre: "Trois propositions, pas cinquante",
            texte:
              "Essentiel, Signature, Prestige. Vous comparez trois coffrets construits pour votre budget, et vous ajustez ce que vous voulez.",
            chiffre: "1 minute",
          },
        ].map((bloc) => (
          <div key={bloc.titre} className="carte p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-or-dark">{bloc.chiffre}</p>
            <h3 className="mt-3 text-xl text-bordeaux">{bloc.titre}</h3>
            <p className="mt-2 text-sm leading-relaxed text-chocolat-light">{bloc.texte}</p>
          </div>
        ))}
      </section>
    </>
  );
}

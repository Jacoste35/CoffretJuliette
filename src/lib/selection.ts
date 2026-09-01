import { chiffrer, construirePropositions, poidsCoffret } from "./engine";
import { getProduit } from "./catalogue";
import type { Besoin, Gamme, Produit, Proposition } from "./types";

type Params = Record<string, string | string[] | undefined>;

const lire = (p: Params, cle: string) => {
  const v = p[cle];
  return Array.isArray(v) ? v[0] : v;
};

const BUDGETS_MIN = 15;

export function lireBesoin(params: Params): Besoin {
  const budget = Number(lire(params, "b"));
  const quantite = Number(lire(params, "q"));
  const prefs = (lire(params, "p") ?? "").split(",").filter(Boolean);
  return {
    typeClient: lire(params, "t") === "pro" ? "PROFESSIONNEL" : "PARTICULIER",
    budget: Number.isFinite(budget) && budget >= BUDGETS_MIN ? budget : 40,
    quantite: Number.isFinite(quantite) && quantite > 0 ? Math.floor(quantite) : 1,
    alcool: (lire(params, "a") as Besoin["alcool"]) ?? "INDIFFERENT",
    preferences: prefs,
    occasion: lire(params, "o") ?? "NOEL",
    priorite: (lire(params, "pr") as Besoin["priorite"]) ?? "BUDGET",
    societe: lire(params, "s"),
    contact: lire(params, "c"),
    email: lire(params, "e"),
    telephone: lire(params, "tel"),
  };
}

export function ecrireBesoin(besoin: Besoin): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("t", besoin.typeClient === "PROFESSIONNEL" ? "pro" : "part");
  sp.set("b", String(besoin.budget));
  sp.set("q", String(besoin.quantite));
  sp.set("a", besoin.alcool);
  if (besoin.preferences.length) sp.set("p", besoin.preferences.join(","));
  sp.set("o", besoin.occasion);
  sp.set("pr", besoin.priorite);
  if (besoin.societe) sp.set("s", besoin.societe);
  if (besoin.contact) sp.set("c", besoin.contact);
  if (besoin.email) sp.set("e", besoin.email);
  if (besoin.telephone) sp.set("tel", besoin.telephone);
  return sp;
}

/** Remplacements choisis par le client, encodés « ancien:nouveau,… ». */
export function lireRemplacements(params: Params): Record<string, string> {
  const brut = lire(params, "sw") ?? "";
  const out: Record<string, string> = {};
  brut.split(",").filter(Boolean).forEach((paire) => {
    const [avant, apres] = paire.split(":");
    if (avant && apres) out[avant] = apres;
  });
  return out;
}

export function ecrireRemplacements(remplacements: Record<string, string>): string {
  return Object.entries(remplacements)
    .map(([a, b]) => `${a}:${b}`)
    .join(",");
}

export function lireExtras(params: Params): Produit[] {
  return (lire(params, "x") ?? "")
    .split(",")
    .filter(Boolean)
    .map((id) => getProduit(id))
    .filter((p): p is Produit => Boolean(p));
}

/**
 * Recompose une proposition en appliquant les remplacements du client.
 * Le chiffrage est intégralement recalculé : aucun total n'est conservé.
 */
export function appliquerRemplacements(
  proposition: Proposition,
  remplacements: Record<string, string>,
  besoin: Besoin,
): Proposition {
  const produits = proposition.produits.map((p) => {
    const idRemplacant = remplacements[p.id];
    const remplacant = idRemplacant ? getProduit(idRemplacant) : undefined;
    return remplacant ?? p;
  });
  const chiffrage = chiffrer(produits, proposition.gamme, besoin.budget);
  return {
    ...proposition,
    produits,
    nbProduitsFragiles: produits.filter((p) => p.fragile).length,
    poidsCoffretG: poidsCoffret(produits, proposition.gamme, besoin.budget),
    chiffrage,
  };
}

export function propositionChoisie(
  besoin: Besoin,
  gamme: Gamme,
  remplacements: Record<string, string>,
): Proposition {
  const propositions = construirePropositions(besoin);
  const base = propositions.find((p) => p.gamme === gamme) ?? propositions[1] ?? propositions[0];
  if (!base) {
    throw new Error("Aucune proposition constructible pour ce besoin.");
  }
  return appliquerRemplacements(base, remplacements, besoin);
}

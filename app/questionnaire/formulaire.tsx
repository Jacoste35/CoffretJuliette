"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const BUDGETS = [30, 40, 50, 75, 100];
const PREFERENCES = [
  { code: "LOCAL", libelle: "Le plus local possible" },
  { code: "GOURMAND", libelle: "Plutôt sucré" },
  { code: "SALE", libelle: "Plutôt salé / apéritif" },
  { code: "PREMIUM", libelle: "Haut de gamme" },
  { code: "BIEN_ETRE", libelle: "Bien-être, non alimentaire" },
];

export default function Formulaire({ pro }: { pro: boolean }) {
  const router = useRouter();
  const [budget, setBudget] = useState(pro ? 45 : 40);
  const [budgetLibre, setBudgetLibre] = useState("");
  const [quantite, setQuantite] = useState(pro ? 50 : 1);
  const [alcool, setAlcool] = useState<"AVEC" | "SANS" | "INDIFFERENT">("INDIFFERENT");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [occasion, setOccasion] = useState("NOEL");
  const [priorite, setPriorite] = useState<"BUDGET" | "QUALITE" | "VALEUR_PERCUE">("BUDGET");
  const [societe, setSociete] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");

  const basculer = (code: string) =>
    setPreferences((p) => (p.includes(code) ? p.filter((c) => c !== code) : [...p, code]));

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetFinal = budgetLibre ? Number(budgetLibre) : budget;
    const sp = new URLSearchParams({
      t: pro ? "pro" : "part",
      b: String(budgetFinal),
      q: String(quantite),
      a: alcool,
      o: occasion,
      pr: priorite,
    });
    if (preferences.length) sp.set("p", preferences.join(","));
    if (societe) sp.set("s", societe);
    if (contact) sp.set("c", contact);
    if (email) sp.set("e", email);
    router.push(`/propositions?${sp.toString()}`);
  };

  return (
    <form onSubmit={envoyer} className="mt-10 space-y-9">
      {pro && (
        <Bloc titre="Votre entreprise">
          <div className="grid gap-4 sm:grid-cols-3">
            <Champ label="Société" value={societe} onChange={setSociete} required />
            <Champ label="Contact" value={contact} onChange={setContact} />
            <Champ label="E-mail" value={email} onChange={setEmail} type="email" />
          </div>
        </Bloc>
      )}

      <Bloc titre="Pour quelle occasion ?">
        <div className="flex flex-wrap gap-2">
          {[
            ["NOEL", "Noël"],
            ["REMERCIEMENT", "Remerciement"],
            ["EVENEMENT", "Événement"],
            ["AUTRE", "Autre"],
          ].map(([code = "", libelle]) => (
            <Puce key={code} actif={occasion === code} onClick={() => setOccasion(code)}>
              {libelle}
            </Puce>
          ))}
        </div>
      </Bloc>

      <Bloc titre={pro ? "Budget par cadeau (HT)" : "Votre budget par coffret (HT)"}>
        <div className="flex flex-wrap items-center gap-2">
          {BUDGETS.map((b) => (
            <Puce
              key={b}
              actif={!budgetLibre && budget === b}
              onClick={() => {
                setBudget(b);
                setBudgetLibre("");
              }}
            >
              {b} €
            </Puce>
          ))}
          <input
            type="number"
            min={15}
            placeholder="Autre"
            value={budgetLibre}
            onChange={(e) => setBudgetLibre(e.target.value)}
            className="w-24 rounded-full border border-or/40 bg-creme-light px-4 py-1.5 text-sm outline-none focus:border-bordeaux"
          />
        </div>
      </Bloc>

      <Bloc titre={pro ? "Combien de cadeaux ?" : "Combien de coffrets ?"}>
        <input
          type="number"
          min={1}
          value={quantite}
          onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
          className="w-32 rounded border border-or/40 bg-creme-light px-4 py-2 outline-none focus:border-bordeaux"
        />
      </Bloc>

      <Bloc titre="Alcool">
        <div className="flex flex-wrap gap-2">
          {[
            ["INDIFFERENT", "Peu importe"],
            ["AVEC", "Avec alcool"],
            ["SANS", "Sans alcool"],
          ].map(([code, libelle]) => (
            <Puce
              key={code}
              actif={alcool === code}
              onClick={() => setAlcool(code as typeof alcool)}
            >
              {libelle}
            </Puce>
          ))}
        </div>
        {alcool === "SANS" && (
          <p className="mt-3 text-sm text-chocolat-light">
            Nous excluons aussi les produits dont l&apos;alcool n&apos;est qu&apos;un
            ingrédient (terrine au calvados, confiture au cidre…).
          </p>
        )}
      </Bloc>

      <Bloc titre="Vos préférences" facultatif>
        <div className="flex flex-wrap gap-2">
          {PREFERENCES.map((p) => (
            <Puce key={p.code} actif={preferences.includes(p.code)} onClick={() => basculer(p.code)}>
              {p.libelle}
            </Puce>
          ))}
        </div>
      </Bloc>

      <Bloc titre="Ce qui compte le plus pour vous">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["BUDGET", "Respecter mon budget", "Le moteur reste sous votre budget."],
            ["QUALITE", "La qualité avant le prix", "Produits plus nobles, artisanaux."],
            ["VALEUR_PERCUE", "Que ça fasse de l'effet", "Effet cadeau, belle présentation."],
          ].map(([code, titre, aide]) => (
            <button
              key={code}
              type="button"
              onClick={() => setPriorite(code as typeof priorite)}
              className={`rounded-lg border p-4 text-left transition ${
                priorite === code
                  ? "border-bordeaux bg-bordeaux/5"
                  : "border-or/30 hover:border-or"
              }`}
            >
              <span className="block font-medium text-bordeaux">{titre}</span>
              <span className="mt-1 block text-xs text-chocolat-light">{aide}</span>
            </button>
          ))}
        </div>
      </Bloc>

      <button
        type="submit"
        className="rounded-full bg-bordeaux px-8 py-3 font-medium text-creme transition hover:bg-bordeaux-dark"
      >
        Voir mes trois propositions
      </button>
    </form>
  );
}

function Bloc({
  titre,
  facultatif,
  children,
}: {
  titre: string;
  facultatif?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-serif text-lg text-bordeaux">
        {titre}
        {facultatif && <span className="ml-2 text-xs text-chocolat-light">(facultatif)</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Puce({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        actif
          ? "border-bordeaux bg-bordeaux text-creme"
          : "border-or/40 bg-creme-light hover:border-or"
      }`}
    >
      {children}
    </button>
  );
}

function Champ({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-chocolat-light">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-or/40 bg-creme-light px-3 py-2 outline-none focus:border-bordeaux"
      />
    </label>
  );
}

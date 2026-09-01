import type { Metadata } from "next";
import Formulaire from "./formulaire";

export const metadata: Metadata = { title: "Votre besoin" };

export default function Questionnaire({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pro = searchParams.t === "pro";
  return (
    <div className="container max-w-3xl py-12">
      <p className="text-xs uppercase tracking-[0.28em] text-or-dark">
        {pro ? "Entreprise" : "Particulier"}
      </p>
      <h1 className="mt-3 text-3xl text-bordeaux">
        {pro ? "Votre projet de cadeaux d'entreprise" : "Votre coffret"}
      </h1>
      <p className="mt-2 text-chocolat-light">
        {pro
          ? "Quelques informations et nous calculons immédiatement trois propositions chiffrées."
          : "Quatre questions, pas une de plus."}
      </p>
      <Formulaire pro={pro} />
    </div>
  );
}

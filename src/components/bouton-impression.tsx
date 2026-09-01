"use client";

export default function BoutonImpression() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-bordeaux px-6 py-2.5 text-sm font-medium text-creme hover:bg-bordeaux-dark"
    >
      Imprimer / enregistrer en PDF
    </button>
  );
}

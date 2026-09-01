import { describe, expect, it } from 'vitest';
import {
  calculerAcompte,
  calculerSolde,
  calculerTotaux,
  type LigneTaxable,
} from '@/domain/tarification/calcul-tva';
import { TAUX_NORMAL, TAUX_PRESTATION, TAUX_REDUIT_ALIMENTAIRE } from '@/domain/tarification/taux-tva';

const ligne = (
  libelle: string,
  prixUnitaireHtCentimes: number,
  tauxBp: number,
  quantite = 1,
): LigneTaxable => ({ libelle, prixUnitaireHtCentimes, tauxBp, quantite });

describe('calculerTotaux', () => {
  it('applique un taux unique sur un coffret entièrement alimentaire', () => {
    const t = calculerTotaux([
      ligne('Terrine de campagne', 620, TAUX_REDUIT_ALIMENTAIRE),
      ligne('Confiture de lait', 480, TAUX_REDUIT_ALIMENTAIRE),
      ligne('Sablés au beurre', 350, TAUX_REDUIT_ALIMENTAIRE),
    ]);

    expect(t.ventilation).toHaveLength(1);
    expect(t.totalHtCentimes).toBe(1450);
    expect(t.totalTvaCentimes).toBe(80); // 1450 × 5,5 % = 79,75 → 80
    expect(t.totalTtcCentimes).toBe(1530);
  });

  it('ventile un coffret mixte 5,5 / 20 par taux, et non globalement', () => {
    const t = calculerTotaux([
      ligne('Terrine de campagne', 620, TAUX_REDUIT_ALIMENTAIRE),
      ligne("Caramels d'Isigny", 390, TAUX_NORMAL), // confiserie : taux normal
      ligne('Cidre bouché AOC', 540, TAUX_NORMAL),
      ligne('Coffret bois + calage', 450, TAUX_PRESTATION),
    ]);

    expect(t.ventilation.map((v) => v.tauxBp)).toEqual([TAUX_REDUIT_ALIMENTAIRE, TAUX_NORMAL]);

    const [reduit, normal] = t.ventilation;
    expect(reduit?.baseHtCentimes).toBe(620);
    expect(reduit?.tvaCentimes).toBe(34); // 34,10 → 34
    expect(normal?.baseHtCentimes).toBe(1380);
    expect(normal?.tvaCentimes).toBe(276);

    expect(t.totalHtCentimes).toBe(2000);
    expect(t.totalTvaCentimes).toBe(310);
    expect(t.totalTtcCentimes).toBe(2310);
  });

  it("arrondit une seule fois par taux, jamais ligne à ligne", () => {
    // 10 lignes à 1,11 € : ligne à ligne on obtiendrait 10 × 0,06 = 0,60 €.
    // Sur le sous-total : 11,10 × 5,5 % = 0,6105 → 0,61 €.
    const lignes = Array.from({ length: 10 }, (_, i) =>
      ligne(`Produit ${i + 1}`, 111, TAUX_REDUIT_ALIMENTAIRE),
    );
    const t = calculerTotaux(lignes);

    expect(t.totalHtCentimes).toBe(1110);
    expect(t.totalTvaCentimes).toBe(61);
  });

  it("arrondit le demi-centime en s'éloignant de zéro", () => {
    // 10 € × 5,5 % = 0,55 € exactement, pas d'arrondi.
    expect(calculerTotaux([ligne('Pile', 1000, TAUX_REDUIT_ALIMENTAIRE)]).totalTvaCentimes).toBe(55);
    // 0,10 € × 5,5 % = 0,0055 € → 0,01 €.
    expect(calculerTotaux([ligne('Demi', 10, TAUX_REDUIT_ALIMENTAIRE)]).totalTvaCentimes).toBe(1);
  });

  it('ventile une remise B2B sur les bases de chaque taux', () => {
    const lignes = [
      ligne('Alimentaire', 1000, TAUX_REDUIT_ALIMENTAIRE),
      ligne('Alcool', 1000, TAUX_NORMAL),
    ];
    const t = calculerTotaux(lignes, { remiseCentimes: 200 });

    // 100 € de remise sur chaque base, car les bases sont égales.
    expect(t.ventilation[0]?.baseHtCentimes).toBe(900);
    expect(t.ventilation[1]?.baseHtCentimes).toBe(900);
    expect(t.totalHtCentimes).toBe(1800);
    expect(t.totalTvaCentimes).toBe(50 + 180);
    expect(t.remiseCentimes).toBe(200);
  });

  it('ne perd aucun centime en ventilant une remise indivisible', () => {
    const t = calculerTotaux(
      [
        ligne('A', 1000, TAUX_REDUIT_ALIMENTAIRE),
        ligne('B', 1000, TAUX_NORMAL),
        ligne('C', 1000, 1000),
      ],
      { remiseCentimes: 100 },
    );
    const remiseAppliquee = 3000 - t.totalHtCentimes;
    expect(remiseAppliquee).toBe(100);
  });

  it('ne remise jamais au-delà du total', () => {
    const t = calculerTotaux([ligne('A', 500, TAUX_NORMAL)], { remiseCentimes: 900 });
    expect(t.remiseCentimes).toBe(500);
    expect(t.totalHtCentimes).toBe(0);
    expect(t.totalTvaCentimes).toBe(0);
  });

  it('traite les frais de port au taux normal comme une ligne ordinaire', () => {
    const t = calculerTotaux([
      ligne('Coffret alimentaire', 3000, TAUX_REDUIT_ALIMENTAIRE),
      ligne('Frais de port', 890, TAUX_PRESTATION),
    ]);
    expect(t.ventilation[1]?.tauxBp).toBe(TAUX_NORMAL);
    expect(t.ventilation[1]?.tvaCentimes).toBe(178);
  });

  it('gère un avoir partiel par une quantité négative', () => {
    const t = calculerTotaux([ligne('Retour terrine', 620, TAUX_REDUIT_ALIMENTAIRE, -1)]);
    expect(t.totalHtCentimes).toBe(-620);
    expect(t.totalTvaCentimes).toBe(-34); // symétrique de la facture
    expect(t.totalTtcCentimes).toBe(-654);
  });

  it('retourne des totaux nuls pour une commande vide', () => {
    const t = calculerTotaux([]);
    expect(t.ventilation).toEqual([]);
    expect(t.totalTtcCentimes).toBe(0);
  });

  it('refuse un prix unitaire négatif', () => {
    expect(() => calculerTotaux([ligne('Erreur', -100, TAUX_NORMAL)])).toThrow(/négatif/);
  });

  it('refuse un taux hors bornes', () => {
    expect(() => calculerTotaux([ligne('Erreur', 100, 12_000)])).toThrow(/taux de TVA invalide/);
  });

  it('refuse une remise négative', () => {
    expect(() => calculerTotaux([ligne('A', 100, TAUX_NORMAL)], { remiseCentimes: -1 })).toThrow(
      /remise négative/,
    );
  });
});

describe('acompte et solde', () => {
  const commande = calculerTotaux([
    ligne('Alimentaire', 3000, TAUX_REDUIT_ALIMENTAIRE),
    ligne('Alcool', 2000, TAUX_NORMAL),
  ]);

  it("ventile l'acompte selon les taux de la commande, pas à un taux moyen", () => {
    const acompte = calculerAcompte(commande, 3000); // 30 %
    expect(acompte.ventilation[0]?.baseHtCentimes).toBe(900);
    expect(acompte.ventilation[0]?.tvaCentimes).toBe(50); // 49,5 → 50
    expect(acompte.ventilation[1]?.baseHtCentimes).toBe(600);
    expect(acompte.ventilation[1]?.tvaCentimes).toBe(120);
  });

  it('donne un solde qui complète exactement la commande', () => {
    const acompte = calculerAcompte(commande, 3000);
    const solde = calculerSolde(commande, acompte);

    expect(solde.totalHtCentimes + acompte.totalHtCentimes).toBe(commande.totalHtCentimes);
    expect(solde.totalTvaCentimes + acompte.totalTvaCentimes).toBe(commande.totalTvaCentimes);
    expect(solde.totalTtcCentimes + acompte.totalTtcCentimes).toBe(commande.totalTtcCentimes);
  });

  it('laisse un solde nul pour un acompte de 100 %', () => {
    const solde = calculerSolde(commande, calculerAcompte(commande, 10_000));
    expect(solde.totalTtcCentimes).toBe(0);
  });

  it("refuse un pourcentage d'acompte hors bornes", () => {
    expect(() => calculerAcompte(commande, 12_000)).toThrow(/acompte invalide/);
  });
});

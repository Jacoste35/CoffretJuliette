#!/usr/bin/env python3
"""Proposition de prix de vente.

ATTENTION — nature de ces donnees :
les coefficients ci-dessous ne proviennent d'AUCUN document fourni. Ce sont
des coefficients de PROPOSITION, batis sur les pratiques courantes de
l'epicerie fine et du coffret cadeau. Chaque prix genere porte le statut
PRIX_PROPOSE_A_VALIDER et reste modifiable depuis le back-office.

Modele : prix de vente HT = prix d'achat HT x coefficient de categorie
         x coefficient de degressivite selon le palier de prix d'achat,
         puis arrondi psychologique.
"""
import csv
from pathlib import Path

BUILD = Path(__file__).parent
STATUT = "PRIX_PROPOSÉ – À VALIDER (coefficient de marché, non issu des documents)"


def _load():
    cats, sous, paliers = {}, {}, []
    with open(BUILD / "coefficients_prix.csv", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            coef = float(r["coefficient"])
            if r["niveau"] == "categorie":
                cats[r["cle"]] = coef
            elif r["niveau"] == "sous_categorie":
                sous[r["cle"]] = coef
            else:
                lo, hi = r["cle"].split("-")
                paliers.append((float(lo), float(hi), coef))
    return cats, sous, sorted(paliers)


COEF_CATEGORIE, COEF_SOUS_CATEGORIE, PALIERS = _load()


def arrondi_psychologique(montant):
    """Arrondi commercial : au dixieme sous 20 EUR, au demi-euro au-dessus."""
    if montant < 20:
        return round(round(montant * 10) / 10, 2)
    return round(round(montant * 2) / 2, 2)


def prix_de_vente(prix_achat_ht, categorie, sous_categorie):
    """Retourne (prix_vente_ht, coefficient_applique, detail_du_calcul)."""
    if prix_achat_ht in ("", None) or float(prix_achat_ht) <= 0:
        return "", "", "Prix d'achat absent ou nul : aucun prix de vente proposé"
    achat = float(prix_achat_ht)
    base = COEF_SOUS_CATEGORIE.get(sous_categorie)
    origine = f"sous-catégorie {sous_categorie}"
    if base is None:
        base = COEF_CATEGORIE.get(categorie)
        origine = f"catégorie {categorie}"
    if base is None:
        return "", "", f"Aucun coefficient défini pour « {categorie} / {sous_categorie} »"

    degressif, palier = 1.0, ""
    for lo, hi, coef in PALIERS:
        if lo <= achat < hi:
            degressif, palier = coef, f"{lo:g}–{hi:g} €"
            break

    coefficient = round(base * degressif, 4)
    vente = arrondi_psychologique(achat * coefficient)
    detail = (f"{achat:.2f} € × {base:.2f} ({origine}) × {degressif:.2f} "
              f"(palier {palier}) = {achat * coefficient:.2f} € → arrondi {vente:.2f} €")
    return vente, coefficient, detail


def enrichir(produit):
    """Complete un produit avec prix de vente, marge et bornes de prix."""
    vente, coefficient, detail = prix_de_vente(
        produit["prix_achat_ht"], produit["categorie"], produit["sous_categorie"])
    produit["prix_vente_ht"] = vente
    produit["coefficient_applique"] = coefficient
    produit["calcul_prix_vente"] = detail
    produit["statut_prix_vente"] = STATUT if vente != "" else ""

    if vente == "":
        return produit
    achat = float(produit["prix_achat_ht"])
    marge = round(vente - achat, 4)
    produit["marge_eur"] = marge
    produit["taux_marge"] = round(marge / vente, 4) if vente else ""
    # Bornes : plancher a 35 % de marge, plafond a +25 % du prix propose
    produit["prix_min_acceptable"] = arrondi_psychologique(achat / 0.65)
    produit["prix_max_conseille"] = arrondi_psychologique(vente * 1.25)
    tva = produit["tva_taux"]
    if tva not in ("", "À CONFIRMER", None):
        produit["prix_vente_ttc"] = round(vente * (1 + float(tva)), 2)
    return produit

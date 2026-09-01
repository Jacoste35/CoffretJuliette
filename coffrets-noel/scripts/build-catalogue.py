#!/usr/bin/env python3
"""Genere le catalogue JSON consomme par le site a partir de la base
normalisee. Le site ne lit jamais les CSV directement : il consomme ce
fichier, seul point d'entree des donnees produits.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXPORT = ROOT.parent / "data" / "base-produits-noel" / "export"


def read(name):
    with open(EXPORT / f"{name}.csv", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def f(v):
    try:
        return round(float(v), 4)
    except (TypeError, ValueError):
        return None


# Categories exclues de la vente au detail : produits professionnels, vrac
# et lignes non vendables telles quelles.
EXCLUES = {"INGREDIENT_PROFESSIONNEL"}
SOUS_EXCLUES = {"CARAMEL_VRAC", "PAI"}

fournisseurs = {r["id_fournisseur"]: r for r in read("FOURNISSEURS")}
produits, exclus = [], 0

for r in read("PRODUITS"):
    if r["statut_ligne"] != "PRODUIT" or not r["prix_vente_ht"]:
        exclus += 1
        continue
    if r["categorie"] in EXCLUES or r["sous_categorie"] in SOUS_EXCLUES:
        exclus += 1
        continue
    prod = fournisseurs.get(r["id_producteur"], {})
    produits.append({
        "id": r["id_produit"],
        "nom": r["nom_produit"],
        "description": r["description"] if r["description"] != "À CONFIRMER" else "",
        "categorie": r["categorie"],
        "sousCategorie": r["sous_categorie"],
        "producteur": r["producteur"],
        "producteurVille": prod.get("ville", ""),
        "fournisseur": r["fournisseur"],
        "departement": r["origine_departement"],
        "region": r["origine_region"],
        "appellation": r["appellation"],
        "alerteMatierePremiere": r["alerte_matiere_premiere"],
        "alcool": r["alcool"],
        "typeAlcool": r["type_alcool"],
        "degreAlcool": r["degre_alcool"],
        "poidsNetG": f(r["poids_net_g"]),
        "volumeMl": f(r["volume_ml"]),
        "conditionnement": r["conditionnement"] if r["conditionnement"] != "À CONFIRMER" else "",
        "prixAchatHt": f(r["prix_achat_ht"]),
        "prixVenteHt": f(r["prix_vente_ht"]),
        "tva": f(r["tva_taux"]) if r["tva_taux"] != "À CONFIRMER" else 0.055,
        "tvaConfirmee": r["tva_taux"] != "À CONFIRMER",
        "margeEur": f(r["marge_eur"]),
        "tauxMarge": f(r["taux_marge"]),
        "noblesse": int(r["niveau_noblesse_propose"]) if r["niveau_noblesse_propose"] else 1,
        "gamme": r["niveau_gamme"],
        "contientVerre": r["contient_verre"].startswith(("OUI", "PROBABLE")),
        "fragile": r["fragile"].startswith("OUI"),
        "produitNoel": r["produit_noel"] == "OUI",
        "delaiFournisseur": prod.get("delais", ""),
        "disponibilite": r["disponibilite"],
        "multipleCommande": int(r["multiple_commande_valeur"]) if r["multiple_commande_valeur"] else None,
        "source": r["source"],
    })

alternatives = {}
for r in read("PRODUITS_ALTERNATIVES"):
    alternatives.setdefault(r["id_produit"], []).append({
        "id": r["id_alternative"],
        "relationPrix": r["relation_prix"],
        "ecartPct": f(r["ecart_prix_pct"]),
    })

producteurs = []
for r in read("FOURNISSEURS"):
    nb = sum(1 for p in produits if p["producteur"] == r["nom"])
    if not nb:
        continue
    producteurs.append({
        "id": r["id_fournisseur"], "nom": r["nom"], "role": r["role"],
        "ville": r["ville"], "codePostal": r["code_postal"],
        "departement": r["departement"], "region": r["region"],
        "siteInternet": r["site_internet"] if r["site_internet"].startswith("http") else "",
        "delais": r["delais"], "nbProduits": nb,
    })

remises = [{
    "code": r["id_remise"], "type": r["type"], "fournisseur": r["fournisseur"],
    "produits": r["produits_concernes"], "palier": r["palier"],
    "remise": r["remise"], "texteSource": r["texte_exact_du_document"],
    "source": r["source"],
} for r in read("REMISES")]

out = {
    "genereLe": "généré par scripts/build-catalogue.py",
    "produits": produits,
    "producteurs": sorted(producteurs, key=lambda x: -x["nbProduits"]),
    "alternatives": alternatives,
    "remises": remises,
}
dest = ROOT / "data" / "catalogue.json"
dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(produits)} produits vendables ({exclus} exclus), "
      f"{len(producteurs)} producteurs -> {dest} ({dest.stat().st_size // 1024} Ko)")

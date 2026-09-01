#!/usr/bin/env python3
"""Regles de derivation appliquees aux donnees brutes.

Principe : aucune valeur n'est inventee. Chaque derivation produit soit une
valeur explicitement justifiee, soit la chaine A_CONFIRMER. Les derivations
qui reposent sur une deduction (et non sur une mention explicite du document)
sont marquees par un niveau de preuve.
"""
import csv
import re
import unicodedata
from pathlib import Path

A_CONFIRMER = "À CONFIRMER"
NON_CALCULABLE = "NON CALCULABLE (donnée absente des documents)"

BUILD_DIR = Path(__file__).parent


# --------------------------------------------------------------------------
# Normalisation de texte
# --------------------------------------------------------------------------
def strip_accents(text):
    return "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )


def normalize_key(text):
    """Cle de comparaison : minuscules, sans accents, sans ponctuation."""
    t = strip_accents(str(text or "").lower())
    t = t.replace("’", "'").replace("`", "'")
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return " ".join(t.split())


def clean_producer_label(label):
    """Separe le nom du producteur du qualificatif de conditionnement colle
    dans la colonne A du tarif Normand Direct (ex. « BALADES NORMANDES Boîte
    bois ronde »). Le libelle source est conserve par ailleurs."""
    raw = " ".join(str(label or "").split())
    suffixes = [
        "Boîte bois ronde",
        "Boîte 4 faces",
        "Boîte fer",
        "D-DAY Boîte bois",
        "D-DAY Boîte métal",
        "Sachet Kraft 100g",
        "Barquette en bois",
        "billes chocolatées",
        "charcutier salaisonnier",
        "TRAITEUR 90 Gr",
        "TRAITEUR 180 Gr",
    ]
    for suf in suffixes:
        if raw.lower().endswith(suf.lower()):
            return raw[: -len(suf)].strip(), suf
    return raw, ""


# --------------------------------------------------------------------------
# Regroupements de producteurs (proposes, jamais fusionnes d'office)
# --------------------------------------------------------------------------
REGROUPEMENTS_SUGGERES = {
    "confitures du pere roupsard": "PÈRE ROUPSARD",
    "le pere roupsard": "PÈRE ROUPSARD",
    "le pere roupsard dessert": "PÈRE ROUPSARD",
    "pere roupsard traiteur": "PÈRE ROUPSARD",
    "pere roupsard les mijotes": "PÈRE ROUPSARD",
    "les dinatoires du pere roupsard": "PÈRE ROUPSARD",
    "pom pom": "POM' POM'",
    "balades normandes": "BALADES NORMANDES",
    "rucher du bocage virois": "RUCHER DU BOCAGE VIROIS",
}


def regroupement(nom_producteur):
    return REGROUPEMENTS_SUGGERES.get(normalize_key(nom_producteur), "")


# --------------------------------------------------------------------------
# Classification categorie / sous-categorie
# --------------------------------------------------------------------------
def load_rules():
    rules = []
    with open(BUILD_DIR / "regles_classification.csv", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            rules.append(
                (
                    int(row["ordre"]),
                    re.compile(row["motif_regex"]),
                    row["valeur"],
                    row["sous_valeur"],
                )
            )
    return sorted(rules, key=lambda r: r[0])


_RULES = load_rules()


def classify(texte):
    """Retourne (categorie, sous_categorie, ordre_regle). PREMIERE regle qui
    matche : l'ordre du fichier de regles encode la priorite (un « vinaigre de
    cidre » est un vinaigre, une « terrine au calvados » est une terrine)."""
    for ordre, pattern, valeur, sous_valeur in _RULES:
        if pattern.search(texte):
            return valeur, sous_valeur or A_CONFIRMER, ordre
    return A_CONFIRMER, A_CONFIRMER, ""


# Replis documentes : appliques uniquement quand aucune regle ne matche.
DEFAUTS = {}
with open(BUILD_DIR / "defauts_par_source.csv", encoding="utf-8") as _fh:
    for _row in csv.DictReader(_fh):
        DEFAUTS[_row["cle_source"]] = _row


def classify_avec_defaut(texte, cle_defaut):
    cat, sous, ordre = classify(texte)
    if cat != A_CONFIRMER:
        return cat, sous, f"règle {ordre}"
    d = DEFAUTS.get(cle_defaut)
    if d:
        return d["categorie_defaut"], d["sous_categorie_defaut"], f"repli documenté : {cle_defaut}"
    return A_CONFIRMER, A_CONFIRMER, "aucune règle applicable"


# Sections explicites du tarif Domaine de Billy : le document classe lui-meme
# ses produits, on reprend son classement plutot que de deviner.
SECTIONS_BILLY = {
    "CIDRES": ("BOISSON_ALCOOLISEE", "CIDRE"),
    "POIRE": ("BOISSON_ALCOOLISEE", "POIRE"),
    "VINAIGRE": ("EPICERIE_SALEE", "VINAIGRE"),
    "JUS DE POMME": ("BOISSON_SANS_ALCOOL", "JUS_DE_FRUIT"),
    "JUS 33 cl": ("BOISSON_SANS_ALCOOL", "JUS_DE_FRUIT"),
    "JUS 75 cl": ("BOISSON_SANS_ALCOOL", "JUS_DE_FRUIT"),
    "CALVADOS": ("BOISSON_ALCOOLISEE", "SPIRITUEUX_POMME"),
    "COFFRETS": ("COFFRET_ET_EMBALLAGE", "COFFRET_OU_PACK"),
}


def classify_billy(section, texte):
    if section == "APERITIFS":
        cat, sous, ordre = classify(texte)
        if cat != A_CONFIRMER:
            return cat, sous, f"règle {ordre}"
        return "BOISSON_ALCOOLISEE", A_CONFIRMER, "section APERITIFS du tarif"
    if section in SECTIONS_BILLY:
        cat, sous = SECTIONS_BILLY[section]
        return cat, sous, f"section « {section} » du tarif fournisseur"
    return classify(texte)[:2] + (A_CONFIRMER,)


# --------------------------------------------------------------------------
# Alcool
# --------------------------------------------------------------------------
INGREDIENT_ALCOOL = re.compile(r"(?i)calvados|pommeau|cidre|vin blanc|vin rouge")
DEGRE = re.compile(r"(?i)(\d{1,2}(?:[,.]\d)?)\s*(?:°|%)")


def alcool_info(texte, categorie, degre_source=""):
    """OUI = boisson alcoolisee. INGREDIENT = alcool cite comme ingredient
    d'un produit alimentaire. NON = aucun indice."""
    degre = degre_source or ""
    if not degre:
        m = DEGRE.search(texte)
        if m and "acide" not in texte.lower():
            degre = m.group(0)
    if categorie == "BOISSON_ALCOOLISEE":
        return "OUI", degre or A_CONFIRMER
    if INGREDIENT_ALCOOL.search(texte):
        return "INGREDIENT_ALCOOLISE", A_CONFIRMER
    return "NON", ""


# --------------------------------------------------------------------------
# Origine
# --------------------------------------------------------------------------
# Une appellation ne vaut preuve d'origine que si le produit EST le produit
# d'appellation. « Moutarde Calvados » ou « Terrine au Calvados » citent le
# calvados comme ingredient : ils ne sont pas normands pour autant. Chaque
# appellation est donc conditionnee a la sous-categorie du produit.
APPELLATIONS_NORMANDES = [
    (re.compile(r"(?i)cotentin\s+aoc"), "AOC Cidre du Cotentin",
     {"CIDRE", "CIDRE_DE_GLACE", "POIRE"}),
    (re.compile(r"(?i)aoc[- ]?xo|aoc[- ]?vsop|\bcalvados\b(?!\s*(arrang|au |aux ))"),
     "Calvados (AOC)", {"SPIRITUEUX_POMME"}),
    (re.compile(r"(?i)pommeau de normandie"), "Pommeau de Normandie (AOC)", {"POMMEAU"}),
]
# Appellation portant sur un INGREDIENT : ne prouve rien sur le lieu de
# fabrication du produit fini.
APPELLATION_INGREDIENT = re.compile(
    r"(?i)d['\u2019]isigny aop|fleur de sel|andouille de vire|cr(è|e)me d['\u2019]isigny")
INDICE_NOM_NORMAND = re.compile(
    r"(?i)normandie|normand\b|normande\b|cotentin|isigny|de la manche|pays d['’]auge|bocage virois"
)


def origine_info(texte, categorie, sous_categorie, fournisseur_ref):
    """Retourne un dict d'origine. Regle stricte demandee par le client :
    un produit n'est PAS normand parce qu'il est vendu par une entreprise
    normande. Seules deux preuves sont acceptees :
      - une appellation protegee citee dans le document ;
      - l'adresse du producteur lorsque le document EST le tarif de ce
        producteur (vente directe)."""
    appellation = ""
    for pattern, libelle, sous_cats in APPELLATIONS_NORMANDES:
        if pattern.search(texte) and sous_categorie in sous_cats:
            appellation = libelle
            break
    appellation_ingredient = bool(APPELLATION_INGREDIENT.search(texte))

    # L'adresse du PRODUCTEUR (ou du fabricant) fait preuve ; celle d'un
    # distributeur ne prouve rien sur le lieu de fabrication.
    role = (fournisseur_ref or {}).get("role", "")
    dept = (fournisseur_ref or {}).get("departement", "")
    adresse_exploitable = (
        fournisseur_ref
        and ("PRODUCTEUR" in role.upper() or "FABRICANT" in role.upper())
        and dept not in ("", A_CONFIRMER)
    )
    if adresse_exploitable:
        return {
            "origine_pays": "France",
            "origine_region": fournisseur_ref.get("region", A_CONFIRMER),
            "origine_departement": fournisseur_ref.get("departement", A_CONFIRMER),
            "lieu_fabrication": f"{A_CONFIRMER} (siège du producteur : "
            f"{fournisseur_ref.get('code_postal','')} {fournisseur_ref.get('ville','')})".strip(),
            "appellation": appellation or "",
            "niveau_preuve_origine": "ADRESSE_DU_PRODUCTEUR",
            "caractere_local": "NORMANDIE_CONFIRMEE"
            if "Normandie" in fournisseur_ref.get("region", "")
            else A_CONFIRMER,
            "savoir_faire_francais": "OUI",
        }

    if appellation:
        return {
            "origine_pays": "France",
            "origine_region": "Normandie",
            "origine_departement": A_CONFIRMER,
            "lieu_fabrication": A_CONFIRMER,
            "appellation": appellation,
            "niveau_preuve_origine": "APPELLATION_PROTEGEE_CITEE_DANS_LE_DOCUMENT",
            "caractere_local": "NORMANDIE_CONFIRMEE",
            "savoir_faire_francais": "OUI",
        }

    if appellation_ingredient or INDICE_NOM_NORMAND.search(texte):
        return {
            "origine_pays": A_CONFIRMER,
            "origine_region": A_CONFIRMER,
            "origine_departement": A_CONFIRMER,
            "lieu_fabrication": A_CONFIRMER,
            "appellation": "",
            "niveau_preuve_origine": "APPELLATION_PORTANT_SUR_UN_INGREDIENT_SEULEMENT"
            if appellation_ingredient else "INDICE_DANS_LE_NOM_DU_PRODUIT_SEULEMENT",
            "caractere_local": "NORMANDIE_INDIQUEE_DANS_LE_NOM_A_VERIFIER",
            "savoir_faire_francais": A_CONFIRMER,
        }

    return {
        "origine_pays": A_CONFIRMER,
        "origine_region": A_CONFIRMER,
        "origine_departement": A_CONFIRMER,
        "lieu_fabrication": A_CONFIRMER,
        "appellation": "",
        "niveau_preuve_origine": "AUCUNE_INFORMATION_DANS_LES_DOCUMENTS",
        "caractere_local": A_CONFIRMER,
        "savoir_faire_francais": A_CONFIRMER,
    }


# --------------------------------------------------------------------------
# Poids / volume lus dans le libelle
# --------------------------------------------------------------------------
POIDS = re.compile(r"(?i)(\d+(?:[,.]\d+)?)\s*(kg|g|gr|grs|gramme?s?)\b")
VOLUME = re.compile(r"(?i)(\d+(?:[,.]\d+)?)\s*(cl|ml|l|litres?)\b")
MULTI = re.compile(r"(?i)(\d+)\s*[xX]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|gr|cl|ml|l)\b")


def _num(s):
    return float(str(s).replace(",", "."))


def poids_volume(texte):
    """Retourne (poids_net_g, volume_ml, mention_source). Uniquement lu dans
    le libelle : aucune estimation."""
    m = MULTI.search(texte)
    if m:
        n, val, unit = int(m.group(1)), _num(m.group(2)), m.group(3).lower()
        if unit in ("kg",):
            return n * val * 1000, "", m.group(0)
        if unit in ("g", "gr"):
            return n * val, "", m.group(0)
        if unit == "cl":
            return "", n * val * 10, m.group(0)
        if unit == "ml":
            return "", n * val, m.group(0)
        if unit == "l":
            return "", n * val * 1000, m.group(0)

    poids = volume = ""
    mention = []
    mp = POIDS.search(texte)
    if mp:
        val, unit = _num(mp.group(1)), mp.group(2).lower()
        poids = val * 1000 if unit == "kg" else val
        mention.append(mp.group(0))
    mv = VOLUME.search(texte)
    if mv:
        val, unit = _num(mv.group(1)), mv.group(2).lower()
        volume = {"cl": val * 10, "ml": val, "l": val * 1000, "litre": val * 1000,
                  "litres": val * 1000}.get(unit, "")
        mention.append(mv.group(0))
    return poids, volume, " + ".join(mention)


# --------------------------------------------------------------------------
# Logistique deduite
# --------------------------------------------------------------------------
CONTENANT_VERRE = re.compile(
    r"(?i)bouteille|btlle|\bcl\b|\bbtl\b|pot le parfait|bocal|magnum|verre (à|a) bi(è|e)re|pinte"
)
CONTENANT_NON_VERRE = re.compile(
    r"(?i)\bbib\b|f(û|u)t|sachet|doypack|barquette|bo(î|i)te bois|bo(î|i)te fer|bo(î|i)te m(é|e)tal|"
    r"bo(î|i)te carr(é|e)e|bo(î|i)te ronde|bo(î|i)te cube|(é|e)tui|vrac|carton"
)


def logistique(texte, categorie, volume_ml):
    """Deductions logistiques. Rien n'est mesure dans les documents : les
    dimensions restent A_CONFIRMER, seuls verre/liquide/fragilite sont
    deduits du conditionnement et marques comme tels."""
    liquide = "NON"
    if categorie in ("BOISSON_ALCOOLISEE", "BOISSON_SANS_ALCOOL") or volume_ml:
        liquide = "OUI_DEDUIT_DU_CONDITIONNEMENT"

    verre = A_CONFIRMER
    if CONTENANT_NON_VERRE.search(texte):
        verre = "NON_DEDUIT_DU_CONDITIONNEMENT"
    if CONTENANT_VERRE.search(texte) and not CONTENANT_NON_VERRE.search(texte):
        verre = "PROBABLE_DEDUIT_DU_CONDITIONNEMENT"

    fragile = "OUI_DEDUIT" if verre.startswith("PROBABLE") else A_CONFIRMER
    protection = (
        "PROTECTION_BOUTEILLE_OU_CONTENANT_VERRE"
        if fragile.startswith("OUI")
        else A_CONFIRMER
    )
    return {
        "liquide": liquide,
        "contient_verre": verre,
        "fragile": fragile,
        "sensible_chocs": fragile,
        "protection_necessaire": "OUI" if fragile.startswith("OUI") else A_CONFIRMER,
        "protection_type": protection,
        "contraintes_transport": (
            "Boisson alcoolisée : vérifier les contraintes transporteur "
            "(déclaration, casse, interdiction sur certains services)"
            if categorie == "BOISSON_ALCOOLISEE"
            else A_CONFIRMER
        ),
    }


# --------------------------------------------------------------------------
# Noblesse (PROPOSITION automatique, modifiable en back-office)
# --------------------------------------------------------------------------
PALIERS_NOBLESSE = [(2.50, 1), (5.00, 2), (10.00, 3), (25.00, 4), (float("inf"), 5)]


def noblesse(prix_ht, categorie, appellation, texte):
    if prix_ht in (None, ""):
        return "", "Prix d'achat absent : niveau non calculable"
    niveau = next(n for seuil, n in PALIERS_NOBLESSE if float(prix_ht) < seuil)
    justif = [f"palier de prix d'achat ({float(prix_ht):.2f} € HT) → {niveau}"]
    if appellation:
        niveau += 1
        justif.append(f"appellation protégée citée ({appellation}) → +1")
    if categorie in ("BOISSON_ALCOOLISEE",) and re.search(
        r"(?i)calvados|vin|pommeau|blanche d'alambic", texte
    ):
        niveau += 1
        justif.append("spiritueux/vin de garde → +1")
    if categorie == "INGREDIENT_PROFESSIONNEL" or re.search(r"(?i)\bvrac\b", texte):
        niveau -= 1
        justif.append("produit vrac / usage professionnel → -1")
    niveau = max(1, min(5, niveau))
    return niveau, " ; ".join(justif)


# --------------------------------------------------------------------------
# Scores et opportunites
# --------------------------------------------------------------------------
NOEL = re.compile(
    r"(?i)no(ë|e)l|sapin|calendrier de l['’]avent|joyeuses f(ê|e)tes|(é|e)pices de no|foie gras|"
    r"fin d['’]ann(é|e)e"
)


def scores(produit):
    poids = produit.get("poids_net_g")
    score_log = ""
    if poids not in (None, ""):
        p = float(poids)
        if p <= 300 and not produit["fragile"].startswith("OUI"):
            score_log = 5
        elif p <= 800:
            score_log = 3
        else:
            score_log = 1
    local = {
        "NORMANDIE_CONFIRMEE": 5,
        "NORMANDIE_INDIQUEE_DANS_LE_NOM_A_VERIFIER": 3,
    }.get(produit["caractere_local"], "")
    return {
        "score_noblesse": produit["niveau_noblesse_propose"],
        "score_valeur_percue": produit["niveau_noblesse_propose"],
        "score_local": local if local != "" else "",
        "score_noel": 5 if NOEL.search(produit["_texte"]) else "",
        "score_logistique": score_log,
        "score_personnalisation": 5
        if produit["personnalisable"] == "OUI"
        else ("" if produit["personnalisable"] == A_CONFIRMER else 0),
        "score_qualite": "",
        "score_marge": "",
        "score_upsell": "",
    }


def tags_opportunite(produit):
    tags = []
    if produit["caractere_local"] == "NORMANDIE_CONFIRMEE":
        tags.append("PRODUIT_LOCAL_EMBLEMATIQUE")
    if NOEL.search(produit["_texte"]):
        tags.append("PRODUIT_DE_NOEL")
    if produit["mention_source"] and "NOUVEAU" in produit["mention_source"].upper():
        tags.append("NOUVEAUTE")
    if produit["personnalisable"] == "OUI":
        tags.append("PERSONNALISABLE")
    if produit["fragile"].startswith("OUI"):
        tags.append("PRODUIT_FRAGILE")
    poids = produit.get("poids_net_g")
    if poids not in (None, ""):
        if float(poids) >= 1000:
            tags.append("PRODUIT_LOURD")
        elif float(poids) <= 300 and not produit["fragile"].startswith("OUI"):
            tags.append("FAIBLE_COUT_LOGISTIQUE")
    if produit["niveau_noblesse_propose"] not in ("", None) and int(
        produit["niveau_noblesse_propose"]
    ) >= 4:
        tags.append("PREMIUM")
    return tags


# --------------------------------------------------------------------------
# Catalogue Caramels d'Isigny : le document classe lui-meme ses articles par
# gamme (titres de blocs renvoyant aux pages du catalogue). On reprend ce
# classement plutot que d'appliquer les regles generiques, qui se feraient
# piéger par les noms de parfums (« BOÎTE 2KG MIEL » n'est pas du miel).
# --------------------------------------------------------------------------
GAMMES_ISIGNY = [
    (re.compile(r"(?i)(é|e)clats et poudre"), "INGREDIENT_PROFESSIONNEL", "PAI"),
    (re.compile(r"(?i)produits alimentaires interm"), "INGREDIENT_PROFESSIONNEL", "PAI"),
    (re.compile(r"(?i)en vrac"), "CONFISERIE", "CARAMEL_VRAC"),
    (re.compile(r"(?i)(à|a) tartiner"), "EPICERIE_SUCREE", "CARAMEL_A_TARTINER"),
    (re.compile(r"(?i)coulis"), "EPICERIE_SUCREE", "CARAMEL_A_TARTINER"),
]
ARTICLES_ISIGNY = [
    (re.compile(r"(?i)cookies"), "BISCUITERIE", "BISCUIT"),
    (re.compile(r"(?i)pr(é|e)sentoir"), "ART_DE_LA_TABLE_ET_OBJET", "OBJET_ET_CONTENANT"),
    (re.compile(r"(?i)pop corn|nougats|sucettes"), "CONFISERIE", "BONBON_ET_CONFISERIE"),
]


def classify_isigny(gamme, article):
    for pattern, cat, sous in ARTICLES_ISIGNY:
        if pattern.search(article):
            return cat, sous, f"article « {article} » du catalogue Isigny"
    for pattern, cat, sous in GAMMES_ISIGNY:
        if pattern.search(gamme):
            return cat, sous, f"gamme « {gamme} » du catalogue Isigny"
    return "CONFISERIE", "CARAMEL", f"gamme « {gamme} » du catalogue Isigny (repli caramel)"


# --------------------------------------------------------------------------
# Matiere premiere : un atelier normand ne rend pas la matiere premiere
# francaise. On le signale explicitement pour ne pas survendre le « local ».
# --------------------------------------------------------------------------
MATIERE_NON_FRANCAISE = re.compile(
    r"(?i)\bcaf(é|e)\b|\bth(é|e)\b|tisane|rooibos|\bmat(é|e)\b|chocolat|cacao|"
    r"cacahu(è|e)te|vanille|banane|kumquat|ananas|mangue|citron vert|noix de cajou|"
    r"chorizo|piment d'espelette|curry|coco|limoncello|\brhum\b|olive")


def alerte_matiere_premiere(texte, categorie):
    if MATIERE_NON_FRANCAISE.search(texte):
        return ("Transformé en Normandie, mais la matière première principale "
                "(café, thé, cacao, fruit exotique, épice…) n'est pas française — "
                "à ne pas présenter comme « produit 100 % local »")
    return ""

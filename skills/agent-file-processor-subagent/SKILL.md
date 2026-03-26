---
name: agent-file-processor-subagent
description: Sous-agent de traitement de fichiers — lecture, parsing, transformation et génération de fichiers multiformats. Se déclenche avec "sous-agent fichier", "file processing agent", "agent qui traite des fichiers", "PDF agent", "Excel agent", "document processor", "file parser agent".
---

# File Processor Sub-Agent

## Quand utiliser ce skill

Utiliser ce skill lorsqu'un agent parent doit déléguer le traitement de fichiers de formats variés (PDF, Excel, CSV, DOCX, JSON, XML, YAML, images) à un sous-agent spécialisé. Pertinent pour les pipelines d'ingestion de données, la génération de rapports multi-formats, la conversion entre formats, l'extraction de contenu depuis des documents scannés, ou le traitement par lot de répertoires entiers de fichiers.

## Workflow

1. **Interface et validation des inputs** — Recevoir depuis l'agent parent : `file_path` (chemin absolu ou URL du fichier), `operation` (read/transform/generate/convert/batch), `params` (paramètres spécifiques à l'opération), `output_format` (format de sortie attendu). Vérifier l'existence du fichier, les permissions de lecture, la taille (alerte si > 100 Mo), et la cohérence entre `operation` et `output_format`.

2. **File type detection** — Détecter le type réel du fichier : lire les magic bytes (premiers 8 octets) avec `python-magic`, vérifier l'extension, inspecter le MIME type. Ne pas faire confiance uniquement à l'extension (un `.csv` peut être un Excel mal renommé). Détecter l'encodage texte avec `chardet` (UTF-8, Latin-1, UTF-16, etc.). Sélectionner le parser approprié selon le type détecté.

3. **Parsers par format** — Appliquer le parser optimal selon le type détecté : PDF → `pdfplumber` (texte et tableaux) ou `PyMuPDF` (fitz, images et métadonnées) ; Excel `.xlsx/.xls` → `openpyxl` ou `xlrd` ; CSV → `pandas.read_csv` (inférence de types, séparateur auto) ; DOCX → `python-docx` (paragraphes, tables, styles) ; JSON → `json`/`orjson` ; XML → `lxml.etree` ; YAML → `PyYAML` ; HTML → `beautifulsoup4` ; Images → `Pillow`.

4. **Text extraction** — Pour les PDFs scannés ou images contenant du texte, activer l'OCR via `pytesseract` (Tesseract engine) ou `easyocr` (multi-langues, deep learning). Extraire les tableaux avec `camelot-py` (PDF) ou `tabula-py` (PDF). Extraire les métadonnées (auteur, date, titre, mots-clés) avec `PyMuPDF` ou `mutagen`. Nettoyer le texte extrait (remove headers/footers répétitifs, normaliser whitespace).

5. **Data transformation** — Appliquer les transformations définies dans `params` : filtrage de lignes/colonnes, agrégation (groupby, sum, mean, count), reformatage (pivot, melt, transpose), mapping de schéma (renommer colonnes, changer types), jointure avec d'autres données, déduplication, tri. Utiliser `pandas` pour les transformations tabulaires, `jq`/`jsonpath` pour JSON, `XSLT` pour XML.

6. **File generation** — Générer de nouveaux fichiers dans le format de sortie demandé : PDF rapport → `reportlab` ou `WeasyPrint` (HTML → PDF) ; Excel avec mise en forme → `openpyxl` (styles, graphiques, formules) ; CSV → `pandas.to_csv` ; JSON → `json.dumps` (pretty-print, indent) ; Markdown → template f-string ; HTML rapport → `jinja2` template ; YAML → `PyYAML.dump`. Sauvegarder dans le répertoire temporaire ou le chemin spécifié.

7. **Batch processing** — Si `operation = "batch"` et `file_path` est un répertoire ou pattern glob : scanner avec `pathlib.Path.glob()`, filtrer par extension, traiter chaque fichier individuellement avec isolation d'erreurs, collecter les résultats agrégés. Supporter le traitement parallèle via `concurrent.futures.ThreadPoolExecutor` pour les opérations I/O-bound. Afficher la progression via callbacks.

8. **Validation** — Valider les données extraites ou générées : vérifier la conformité au schéma attendu (`jsonschema`, `pydantic`), l'intégrité des données numériques (range checks, null ratios), la cohérence des fichiers générés (ouvrir et re-lire pour vérifier), la taille minimale du fichier de sortie. Retourner les statistiques de validation dans `stats`.

9. **Error handling** — Gérer les erreurs spécifiques aux fichiers : fichier corrompu (binaire invalide), encodage non détectable, PDF protégé par mot de passe (signaler sans déchiffrer), Excel avec macros (warning sécurité), fichier trop volumineux pour la mémoire (streaming avec `chunksize`), données manquantes (stratégie configurable : skip, fill NA, raise). Logger chaque erreur avec fichier, ligne/page, et nature du problème.

10. **Cleanup et ressources** — Libérer les ressources après traitement : fermer les handles de fichiers, supprimer les fichiers temporaires (`tempfile.TemporaryDirectory` context manager), libérer la mémoire des DataFrames volumineux (`del df; gc.collect()`). Pour les très gros fichiers, utiliser le streaming/chunking natif de chaque parser pour éviter les OOM. Retourner les statistiques de performance dans l'output.

## Interface du sous-agent

**Input schema :**
```python
{
  "file_path": str,               # Chemin absolu du fichier ou répertoire (obligatoire)
  "operation": str,               # "read" | "transform" | "generate" | "convert" | "batch" | "extract"
  "params": {                     # Paramètres spécifiques à l'opération (optionnel)
    "sheet_name": str,            # Pour Excel : nom ou index de la feuille
    "columns": list[str],         # Colonnes à extraire
    "filters": dict,              # Filtres à appliquer {"column": "value"}
    "transformations": list[dict],# Séquence de transformations
    "ocr_language": str,          # Langue OCR : "fra", "eng", "ara" (défaut: "fra+eng")
    "chunk_size": int,            # Taille des chunks pour gros fichiers (défaut: 10000)
    "encoding": str,              # Forcer l'encodage (défaut: auto-détection)
    "password": str               # Mot de passe pour fichiers protégés
  },
  "output_format": str,           # "json" | "csv" | "excel" | "pdf" | "markdown" | "html" | "dict"
  "output_path": str,             # Chemin de sortie (optionnel, génère un temp si absent)
  "batch_pattern": str,           # Glob pattern pour batch (ex: "*.pdf")
  "parallel_workers": int         # Nombre de workers parallèles pour batch (défaut: 4)
}
```

**Output schema :**
```python
{
  "result": any,                  # Données extraites (dict, list) ou None si fichier généré
  "output_path": str,             # Chemin du fichier généré (None si result contient les données)
  "stats": {                      # Statistiques de traitement
    "rows_processed": int,
    "pages_processed": int,
    "files_processed": int,       # Pour batch
    "bytes_read": int,
    "bytes_written": int,
    "detected_type": str,         # Type MIME détecté
    "detected_encoding": str      # Encodage détecté
  },
  "errors": list[dict],           # [{"file": str, "page": int, "error": str}]
  "warnings": list[str],          # Avertissements non bloquants
  "execution_time_s": float       # Durée totale en secondes
}
```

**Librairies Python recommandées :**
```
pdfplumber>=0.10.0
PyMuPDF>=1.23.0
openpyxl>=3.1.0
pandas>=2.0.0
python-docx>=1.1.0
python-magic>=0.4.27
chardet>=5.2.0
pytesseract>=0.3.10
Pillow>=10.0.0
camelot-py[cv]>=0.11.0
reportlab>=4.0.0
jinja2>=3.1.0
PyYAML>=6.0.0
lxml>=4.9.0
```

## Règles

1. **Interface contractuelle stricte** — Valider `file_path`, `operation`, et `output_format` avant toute opération. Si le fichier n'existe pas, retourner un output d'erreur formaté (ne pas lever `FileNotFoundError` non catchée). Si `operation` et `output_format` sont incompatibles (ex: generate sans template), signaler clairement dans `errors`. L'agent parent reçoit toujours un output conforme.

2. **Robustesse sur fichiers corrompus** — Un fichier partiellement lisible doit retourner les données extraites jusqu'au point de corruption, avec un warning. Ne jamais crasher sur un fichier corrompu ou vide. En mode batch, l'échec d'un fichier ne doit jamais arrêter le traitement des autres fichiers du lot.

3. **Sécurité et isolation** — Ne jamais exécuter de macros Excel, de scripts embarqués dans des PDFs, ou de code dans des fichiers YAML (`yaml.safe_load` uniquement). Ne pas suivre les liens externes dans les documents. Limiter la taille des fichiers traités (configurable, défaut 500 Mo). Ne jamais écrire en dehors du répertoire de sortie autorisé.

4. **Efficacité mémoire** — Pour les fichiers > 50 Mo, utiliser systématiquement le mode streaming/chunking. Les DataFrames pandas doivent être explicitement libérés après usage. Utiliser des générateurs plutôt que des listes pour les transformations en pipeline. Reporter la consommation mémoire approximative dans `stats`.

5. **Code Python fonctionnel fourni** — Fournir une implémentation complète de la classe `FileProcessorSubAgent` avec méthodes `run(input_schema) -> output_schema`, `_detect_file_type()`, `_parse_file()`, `_transform_data()`, `_generate_output()`, support du batch processing, et un exemple d'intégration dans un pipeline d'ingestion de données piloté par agent.

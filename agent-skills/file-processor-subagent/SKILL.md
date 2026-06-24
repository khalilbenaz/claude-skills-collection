---
name: file-processor-subagent
description: Sous-agent de traitement de fichiers — lecture, parsing, transformation et génération de fichiers multiformats. Se déclenche avec "sous-agent fichier", "file processing agent", "agent qui traite des fichiers", "PDF agent", "Excel agent", "document processor", "file parser agent".
---

# File Processor Sub-Agent

## Quand utiliser ce skill

Déléguer à ce sous-agent quand l'agent parent doit traiter des fichiers de formats variés sans polluer son contexte principal : ingestion de données, conversion de format, extraction de contenu (dont OCR), génération de rapports, traitement par lot d'un répertoire entier.

**Ne pas utiliser** si le fichier est < 5 Ko et que le format est trivial (JSON, YAML simple) : l'agent parent peut le lire directement.

---

## Workflow en étapes

### 1. Validation des inputs

Avant toute opération, vérifier :

```python
import os, pathlib

def validate_input(inp: dict) -> list[str]:
    errors = []
    fp = inp.get("file_path", "")
    if not fp:
        errors.append("file_path manquant")
    elif not pathlib.Path(fp).exists() and inp.get("operation") != "generate":
        errors.append(f"Fichier introuvable : {fp}")
    if pathlib.Path(fp).stat().st_size > 500 * 1024 * 1024:
        errors.append("Fichier > 500 Mo : utiliser batch + chunk_size")
    if inp.get("operation") not in ("read","transform","generate","convert","batch","extract"):
        errors.append("operation invalide")
    return errors
```

Retourner un `output_schema` avec `errors` rempli si la validation échoue — ne jamais lever d'exception non catchée vers l'agent parent.

---

### 2. Détection du type de fichier

Ne pas faire confiance à l'extension seule.

```python
import magic  # python-magic
import chardet

def detect_file_type(path: str) -> tuple[str, str]:
    mime = magic.from_file(path, mime=True)  # ex: "application/pdf"
    encoding = "binary"
    if mime.startswith("text/"):
        with open(path, "rb") as f:
            raw = f.read(32_768)
        encoding = chardet.detect(raw)["encoding"] or "utf-8"
    return mime, encoding
```

**Critères de sélection du parser :**

| MIME détecté | Parser prioritaire | Fallback |
|---|---|---|
| `application/pdf` | `pdfplumber` | `PyMuPDF` (fitz) |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `openpyxl` | `pandas.read_excel` |
| `application/vnd.ms-excel` | `xlrd` | `pandas.read_excel` |
| `text/csv` | `pandas.read_csv` | `csv.DictReader` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `python-docx` | — |
| `application/json` | `orjson` | `json` |
| `application/xml` ou `text/xml` | `lxml.etree` | — |
| `text/html` | `BeautifulSoup` (lxml parser) | — |
| `image/*` | `Pillow` + `pytesseract` (OCR) | `easyocr` |

---

### 3. Parsing par format

**PDF (texte + tableaux) :**
```python
import pdfplumber

with pdfplumber.open(file_path) as pdf:
    text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    tables = [p.extract_tables() for p in pdf.pages]
```

**PDF scanné → OCR :**
```python
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

doc = fitz.open(file_path)
for page in doc:
    pix = page.get_pixmap(dpi=300)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    text = pytesseract.image_to_string(img, lang="fra+eng")
```

**Excel avec multi-feuilles :**
```python
import openpyxl

wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
for sheet_name in wb.sheetnames:
    ws = wb[sheet_name]
    rows = list(ws.values)
```

**CSV gros fichier (streaming) :**
```python
import pandas as pd

for chunk in pd.read_csv(file_path, chunksize=10_000, encoding=encoding,
                          sep=None, engine="python"):  # sep auto-détecté
    process(chunk)
```

**XML avec namespace :**
```python
from lxml import etree

tree = etree.parse(file_path)
ns = {"ns": "http://example.com/schema"}
nodes = tree.xpath("//ns:Record", namespaces=ns)
```

---

### 4. Transformation des données

```python
import pandas as pd

def transform(df: pd.DataFrame, params: dict) -> pd.DataFrame:
    if cols := params.get("columns"):
        df = df[cols]
    if filters := params.get("filters"):
        for col, val in filters.items():
            df = df[df[col] == val]
    for t in params.get("transformations", []):
        if t["type"] == "rename":
            df = df.rename(columns=t["mapping"])
        elif t["type"] == "groupby":
            df = df.groupby(t["by"]).agg(t["agg"]).reset_index()
        elif t["type"] == "fillna":
            df = df.fillna(t["value"])
        elif t["type"] == "deduplicate":
            df = df.drop_duplicates(subset=t.get("subset"))
    return df
```

Pour JSON complexe, préférer `jq` via subprocess :
```bash
jq '.data[] | select(.status == "active") | {id, name}' input.json > output.json
```

---

### 5. Génération de fichiers

**Rapport PDF avec ReportLab :**
```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle

doc = SimpleDocTemplate(output_path, pagesize=A4)
data = [["Colonne A", "Colonne B"]] + rows
table = Table(data)
doc.build([table])
```

**Excel avec styles :**
```python
from openpyxl.styles import Font, PatternFill

ws["A1"].font = Font(bold=True)
ws["A1"].fill = PatternFill("solid", fgColor="4472C4")
wb.save(output_path)
```

**HTML via Jinja2 :**
```python
from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("templates/"))
html = env.get_template("report.html.j2").render(data=rows, title="Rapport")
Path(output_path).write_text(html, encoding="utf-8")
```

---

### 6. Batch processing

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

def batch_process(directory: str, pattern: str, workers: int = 4) -> list[dict]:
    files = list(Path(directory).glob(pattern))
    results, errors = [], []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(process_single, f): f for f in files}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                errors.append({"file": str(futures[future]), "error": str(e)})
    return results, errors
```

Règle : l'échec d'un fichier ne bloque jamais les autres. Logger chaque erreur avec nom de fichier + nature.

---

### 7. Output schema

```python
{
  "result": dict | list | None,   # Données extraites, ou None si fichier généré
  "output_path": str | None,      # Chemin fichier généré
  "stats": {
    "rows_processed": int,
    "pages_processed": int,
    "files_processed": int,
    "bytes_read": int,
    "bytes_written": int,
    "detected_type": str,
    "detected_encoding": str
  },
  "errors": [{"file": str, "page": int, "error": str}],
  "warnings": ["string"],
  "execution_time_s": float
}
```

---

## Garde-fous et anti-patterns

| Anti-pattern | Risque | Correction |
|---|---|---|
| `yaml.load()` sans `Loader` | Exécution de code arbitraire | Toujours `yaml.safe_load()` |
| `pd.read_csv` sur fichier > 1 Go en mémoire | OOM | `chunksize=50_000` |
| Faire confiance à l'extension `.csv` | Peut être Excel, TSV, ou corrompu | Vérifier les magic bytes |
| Lire un PDF protégé sans vérifier | Exception non catchée | Tester `pdf.is_encrypted` avant extraction |
| Fermer sans context manager | Handle de fichier non fermé | Toujours `with open(...)` ou `with pdfplumber.open(...)` |
| `concurrent.futures` sur fichiers > 200 Mo | Swap mémoire | Limiter workers, traiter séquentiellement les gros fichiers |
| Écrire en dehors du `output_path` fourni | Effet de bord non contrôlé | Valider que le chemin de sortie est sous le répertoire autorisé |
| `del df` sans `gc.collect()` | Mémoire non libérée immédiatement | `del df; import gc; gc.collect()` après chaque chunk |

---

## Librairies recommandées (2026)

```
pdfplumber>=0.11.0
PyMuPDF>=1.24.0
openpyxl>=3.2.0
pandas>=2.2.0
python-docx>=1.1.0
python-magic>=0.4.27
chardet>=5.2.0
pytesseract>=0.3.10
Pillow>=10.3.0
camelot-py[cv]>=0.11.0
reportlab>=4.2.0
jinja2>=3.1.4
PyYAML>=6.0.1
lxml>=5.2.0
orjson>=3.10.0
```

Installation OCR système requis :
```bash
# Ubuntu/Debian
apt-get install tesseract-ocr tesseract-ocr-fra poppler-utils libmagic1

# Windows
choco install tesseract poppler
```

---

## Exemple d'intégration agent parent

```python
# L'agent parent appelle le sous-agent via tool call
result = file_processor_subagent.run({
    "file_path": "/data/invoices/",
    "operation": "batch",
    "batch_pattern": "*.pdf",
    "params": {"ocr_language": "fra", "columns": ["date", "montant", "fournisseur"]},
    "output_format": "excel",
    "output_path": "/data/output/invoices_summary.xlsx",
    "parallel_workers": 4
})

if result["errors"]:
    # Signaler à l'agent parent les fichiers en échec sans bloquer
    log_errors(result["errors"])

df_summary = pd.read_excel(result["output_path"])
```

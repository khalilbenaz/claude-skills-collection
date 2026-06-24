---
name: dev-pixel-art-advisor
description: Guide de création de pixel art pour jeux et interfaces rétro. Se déclenche avec "pixel art", "sprite", "tileset", "pixel", "retro art", "8-bit", "16-bit", "Aseprite", "game art", "spritesheet".
---

# Pixel Art Advisor

## Critères de décision — Résolution et style

| Contexte cible | Canvas sprite | Palette max | Outil recommandé |
|---|---|---|---|
| NES / 8-bit strict | 8×8 à 16×16 | 4 couleurs/sprite | Aseprite, LibreSprite |
| Game Boy (mono) | 8×8 à 16×16 | 4 niveaux de gris | Aseprite |
| SNES / 16-bit | 16×16 à 32×32 | 16–32 couleurs | Aseprite, Pyxel Edit |
| Moderne pixel art | 32×32 à 64×64 | Illimité (palette cohérente) | Aseprite |
| Interface UI rétro | 8×8 à 24×24 | 8–16 couleurs | Aseprite, Shoebox |

**Règle de départ** : choisir la plus petite résolution qui rend la silhouette lisible. Agrandir plus tard est coûteux.

---

## Workflow en étapes

### 1. Canvas et grille

```
Aseprite > File > New
  Width:  32  Height: 32
  Color mode: Indexed  (limite la palette dès le début)
  Background: Transparent
```

- Activer la grille (`View > Grid > Grid Settings` → 8×8 ou 16×16 selon le tile size).
- Travailler à 400–800 % de zoom ; toujours vérifier à 100 % pour la lisibilité réelle.
- Définir le **pixels per unit** avant toute création : ex. 16 px = 1 unité de jeu → facilite l'import moteur.

### 2. Palette de couleurs

Construire des **color ramps** (minimum 3 teintes par couleur principale) avec hue shifting :

```
Couleur base : H=30, S=70, V=80   (brun chaud)
Ombre       : H=240, S=40, V=40   (bleu froid — pas de gris pur)
Lumière     : H=50,  S=30, V=95   (jaune chaud)
```

- Utiliser le mode **HSV** dans Aseprite (`Edit > Preferences > Color` → HSV).
- Limiter la palette totale du projet dans un fichier `.pal` partagé entre tous les assets.
- Importer une palette de référence : `Palette > Load Palette > fichier.pal`.
- **Dithering** pour simuler une couleur intermédiaire sans l'ajouter à la palette :

```
Pattern checkerboard 2×2 :
  ▓░▓░      = 50 % mélange entre couleur A et B
  ░▓░▓
```

### 3. Formes et contours

- Dessiner la **silhouette en noir** avant d'ajouter couleurs ou détails.
- Anti-aliasing manuel sur les courbes : intercaler 1–2 pixels de teinte intermédiaire sur les jaggies prononcés (`> 45°`).
- Choisir le type d'outline selon l'ambiance :
  - **Outline noir dur** → action, lisibilité maximale, style cartoon.
  - **Outline coloré** (version assombrie de la couleur adjacente) → style doux, RPG.
  - **Pas d'outline** → décors, éléments d'arrière-plan.
- Éviter les **lone pixels** (pixel isolé sans voisin de même couleur) : ils créent du bruit visuel.

### 4. Animation sprite — Walk cycle (exemple 4 frames)

```
Frame 1 : Contact  — pied gauche à terre, pied droit levé
Frame 2 : Passage  — poids au centre, corps légèrement bas
Frame 3 : Contact  — pied droit à terre, pied gauche levé
Frame 4 : Passage  — poids au centre (miroir F2)
```

Paramètres Aseprite :
```
Timeline > Frame duration : 100–120 ms (8–10 fps) pour walk
Timeline > Frame duration : 60–80 ms (12–16 fps) pour effets rapides
```

- **Squash & stretch** : compresser verticalement de 1–2 px à l'impact, étirer à la montée.
- **Smear frame** : 1 frame de flou directionnel (pixels étirés) sur les attaques rapides.
- Toujours tester l'animation en boucle continue dans Aseprite (`> Play`) avant export.

### 5. Tilesets et autotile

Structure bitmask 4-bit (16 tiles, transitions simples) :

```
Tile ID  Voisins (N S E O)   Usage
  0       0000               Isolé
  15      1111               Plein entouré
  5       0101               Corridor horizontal
  10      1010               Corridor vertical
```

- Pour autotile 47 tuiles (RPG Maker / Godot `TileMap` autotile) : regrouper les tiles dans l'ordre bitmask attendu par le moteur.
- **Seamless** : les 4 bords d'une tile doivent être identiques à leurs voisins → vérifier avec `View > Tiled Mode` dans Aseprite.

### 6. Export et intégration moteur

**Spritesheet Aseprite CLI** (automatisable en CI) :
```bash
aseprite -b character.aseprite \
  --sheet character_sheet.png \
  --sheet-type packed \
  --data character_sheet.json \
  --format json-array \
  --trim
```

**Unity — paramètres d'import PNG** :
```
Texture Type      : Sprite (2D and UI)
Sprite Mode       : Multiple
Pixels Per Unit   : 16   (ou la valeur projet)
Filter Mode       : Point (no filter)   ← CRITIQUE pour pixel art net
Compression       : None
Max Size          : 2048  (power-of-two)
```

**Godot 4 — import settings** :
```
[importer = "texture"]
params/filter = false          # Point filtering
params/compress/mode = 0       # Lossless
params/mipmaps/generate = false
```

**GameMaker** : `Sprite Editor > Import Strip` → définir `Frame Width`, `Frame Height`, `Number of Frames`.

---

## Anti-patterns et pièges fréquents

| Piège | Symptôme | Correction |
|---|---|---|
| Palette trop grande | Incohérence visuelle entre assets | Créer une palette maître `.pal`, l'imposer à tous les sprites |
| Outline noir uniforme | Personnages collés au fond | Passer en outline coloré ou supprimer l'outline sur les décors |
| Filter Mode Bilinear | Sprites flous en jeu | Forcer `Point (no filter)` dans l'import moteur |
| Canvas non power-of-two | Artefacts GPU, atlas fragmenté | Toujours exporter en 256×256, 512×512, 1024×512, etc. |
| Lone pixels | Bruit, manque de lisibilité | Regel : chaque pixel doit avoir ≥ 1 voisin de même famille |
| Animation trop fluide | Perd le charme rétro | Réduire à 6–8 fps et ajouter un hold explicite sur les frames clés |
| Ignorer la silhouette | Design illisible à petite taille | Toujours valider en noir et blanc à 100 % avant de coloriser |

---

## Bonnes pratiques 2026

- **Aseprite scripts Lua** : automatiser le recoloring de palette pour les variantes de personnage.
  ```lua
  -- Exemple : swap palette slot 3 (rouge) → bleu
  local sprite = app.activeSprite
  local pal = sprite.palettes[1]
  pal:setColor(3, Color{r=30, g=80, b=200})
  ```
- **Version control** : commiter les fichiers `.aseprite` (format binaire versionnable) + les PNG exportés générés en CI.
- **Figma / Excalidraw** pour le moodboard de palette avant de commencer ; éviter l'itération palette en cours de production.
- **Accessibilité** : tester la palette avec un simulateur daltonisme (`Colour Oracle`, plugin Aseprite `Color Blindness Simulator`) ; les jeux indés sont concernés.
- **Pixel art IA-assisté** : les générateurs (Midjourney, Stable Diffusion pixel art LoRA) produisent du non-pixel-art à nettoyer manuellement ; ne pas utiliser en production sans audit pixel par pixel.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.

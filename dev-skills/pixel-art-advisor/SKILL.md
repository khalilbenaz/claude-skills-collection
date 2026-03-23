---
name: pixel-art-advisor
description: Guide de création de pixel art pour jeux et interfaces rétro. Se déclenche avec "pixel art", "sprite", "tileset", "pixel", "retro art", "8-bit", "16-bit", "Aseprite", "game art", "spritesheet".
---

# Pixel Art Advisor

## Workflow

1. **Canvas et résolution** : Choisir la taille du canvas en fonction du style visuel cible (8x8 pour NES-like, 16x16 ou 32x32 pour 16-bit, 48x48+ pour les personnages détaillés), définir le bon aspect ratio selon la plateforme cible, et établir une grille de travail cohérente avant de commencer tout asset.

2. **Palette de couleurs** : Limiter volontairement la palette (4 couleurs par NES, 16 par Game Boy Color, 32 pour SNES-style) pour une cohérence visuelle forte, créer des color ramps (du plus sombre au plus clair) pour chaque couleur principale, appliquer le hue shifting pour des ramps plus vivantes, et maîtriser le dithering pour simuler des couleurs intermédiaires.

3. **Formes et contours** : Dessiner des formes lisibles avec un minimum de pixels, maîtriser l'anti-aliasing manuel pour les courbes (doubles pixels, jaggies corrigés), choisir entre outline dur (contour noir) ou outline coloré selon l'ambiance, et explorer le sub-pixel art pour un mouvement plus fluide à basse résolution.

4. **Animation sprite** : Construire des walk cycles convaincants en 4 à 8 frames (anticipation, contact, passage, levée), créer des animations idle expressives avec un minimum de frames, concevoir des attaques et effets lisibles (smear frames, impact frames), et appliquer le squash and stretch pour donner de la vie aux personnages.

5. **Tilesets** : Créer des tiles seamless qui se répètent sans rupture visible, implémenter des systèmes d'autotile pour les transitions de terrain (bitmask à 47 ou 256 variations), concevoir les transitions entre biomes ou types de surface, et structurer le tilemap pour la lisibilité dans l'éditeur de niveaux.

6. **Character design** : Travailler la silhouette en premier (reconnaissable en noir et blanc), maximiser la lisibilité à petite taille avec des éléments distinctifs clairs, respecter des proportions cohérentes avec le style du jeu (tête plus grande pour chibi, proportions réalistes pour JRPG), et concevoir des expressions faciales expressives malgré la contrainte de résolution.

7. **Lighting et shading** : Définir une source lumineuse unique et cohérente pour tous les assets du projet, appliquer l'ambient occlusion pour donner de la profondeur aux formes, utiliser le rim lighting pour détacher les personnages du fond, et maîtriser le cel shading pixel pour un rendu stylisé net et lisible.

8. **Export et intégration** : Packager les sprites en spritesheets optimisées (atlas texture power-of-two), exporter en PNG sans perte avec transparence, configurer l'import dans Unity (Sprite Editor, pixels per unit, filter mode Point) ou Godot (import settings, snap), et paramétrer les animations dans le moteur en référençant les frames de la spritesheet.

## Règles

- Fournis des conseils concrets adaptés à la résolution et au style demandés (8-bit, 16-bit, moderne pixel art).
- Adapte les recommandations au moteur de jeu utilisé pour l'intégration (Unity, Godot, GameMaker, RPG Maker).
- Priorise la lisibilité et la cohérence visuelle de la palette sur le détail : moins de couleurs bien choisies valent mieux que beaucoup de couleurs incohérentes.
- Mentionne les outils recommandés : Aseprite (principal), LibreSprite (gratuit), Pyxel Edit (tilesets), GraphicsGale.
- Inclus des exemples de techniques spécifiques (dithering, color ramp, bitmask autotile) avec des explications étape par étape.

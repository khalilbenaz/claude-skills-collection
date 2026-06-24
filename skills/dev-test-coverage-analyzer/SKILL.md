---
name: dev-test-coverage-analyzer
description: Analyse et améliore la couverture de tests d'un projet. Se déclenche avec "couverture", "coverage", "code coverage", "branches non testées", "améliorer mes tests", "dead code", "mutation testing".
---

# Test Coverage Analyzer

## Workflow

### 1. Choisir et configurer l'outil de coverage

**JavaScript / TypeScript**
```bash
# c8 (natif V8, recommandé Node 18+)
npm install --save-dev c8
npx c8 --reporter=lcov --reporter=text npm test

# Istanbul / nyc (legacy mais encore répandu)
npx nyc --reporter=lcov --reporter=text mocha
```

**.NET / C#**
```bash
dotnet add package coverlet.collector
dotnet test --collect:"XPlat Code Coverage" \
  --results-directory ./TestResults
# Convertir en HTML (nécessite reportgenerator)
reportgenerator -reports:TestResults/**/coverage.cobertura.xml \
  -targetdir:coverage-html -reporttypes:Html
```

**Python**
```bash
pip install pytest-cov
pytest --cov=src --cov-report=html --cov-report=term-missing
```

**Java (Maven)**
```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution><goals><goal>prepare-agent</goal></goals></execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals><goal>report</goal></goals>
    </execution>
  </executions>
</plugin>
```
```bash
mvn test jacoco:report   # rapport dans target/site/jacoco/
```

---

### 2. Interpréter les métriques — critères de décision

| Métrique | Signification | Seuil minimum recommandé |
|---|---|---|
| **Line coverage** | Lignes exécutées / total | 80 % global |
| **Branch coverage** | Chaque if/else/switch couverts | 70 % |
| **Function coverage** | Fonctions appelées ≥ 1 fois | 90 % |
| **Statement coverage** | Instructions individuelles | ≈ line coverage |
| **Mutation score** | Tests détectent les mutations | 70 % |

Priorité : **branch > line**. Un fichier à 90 % line coverage peut n'avoir aucun test de sa branche `catch` ou de son chemin `null`.

---

### 3. Identifier les zones non couvertes (priorité)

Ordre d'analyse :
1. Fonctions/méthodes à zéro couverture dans le code métier critique (paiement, auth, calculs financiers).
2. Branches de gestion d'erreur (`catch`, `else`, `default`) jamais exercées.
3. Fichiers entiers non couverts (oubli d'import dans le test runner).
4. Lignes isolées non couvertes dans des fonctions par ailleurs testées (early returns, guards).

**Détecter le dead code réel** : une ligne non couverte depuis des mois n'est pas forcément du dead code — vérifier via `git log` ou grep si elle est appelée en production. Utiliser `knip` (TS) ou `vulture` (Python) pour détecter le dead code structurel.

```bash
# TypeScript : dead exports
npx knip

# Python : dead code
pip install vulture
vulture src/ --min-confidence 80
```

---

### 4. Prioriser les efforts de test

Règle 80/20 : concentrer les efforts sur le code à impact business, pas sur maximiser le chiffre.

**À couvrir en priorité :**
- Logique métier (validation, calcul, transformation de données)
- Chemins d'erreur et cas limites (valeur nulle, liste vide, token expiré)
- Intégrations externes (clients HTTP, accès BDD) via mocks

**À ne pas couvrir ou ignorer explicitement :**
- Code généré automatiquement (migrations EF Core, scaffolding, proto-generated)
- Fichiers de configuration pure (`.config.ts`, `appsettings.json` wrappers)
- Bootstrap / entry points (`main.ts`, `Program.cs`) sauf si logique métier dedans

**.NET — exclure du coverage :**
```csharp
[ExcludeFromCodeCoverage]
public class GeneratedMappingProfile : Profile { ... }
```

**Jest / c8 — exclure via commentaire :**
```js
/* c8 ignore next 3 */
if (process.env.NODE_ENV === 'development') { ... }
```

**Python — exclure via `.coveragerc` :**
```ini
[report]
omit =
    */migrations/*
    */generated/*
    */manage.py
```

---

### 5. Générer des tests ciblés pour les gaps

Pour chaque zone non couverte, utiliser ce pattern :
1. Lire le code source de la zone manquante.
2. Identifier le contrat de la fonction (entrées, sorties, effets de bord).
3. Écrire un test qui suit le chemin non couvert (branch spécifique).
4. Re-lancer le rapport et vérifier que la couverture progresse.

Exemple — branche `catch` non couverte :
```ts
// Code source
async function fetchUser(id: string) {
  try {
    return await db.findUser(id);
  } catch (e) {
    logger.error(e);   // ← jamais testé
    throw new AppError('USER_NOT_FOUND');
  }
}

// Test ajouté
it('rethrows AppError when db throws', async () => {
  jest.spyOn(db, 'findUser').mockRejectedValue(new Error('db down'));
  await expect(fetchUser('1')).rejects.toThrow('USER_NOT_FOUND');
});
```

---

### 6. Mutation testing — valider la qualité des assertions

La couverture de lignes ne garantit pas que les tests *assertent* correctement. Le mutation testing modifie le code source (change `>` en `>=`, supprime un `return`, etc.) et vérifie que les tests échouent.

**Stryker (.NET / JS/TS)**
```bash
# .NET
dotnet tool install -g dotnet-stryker
dotnet stryker

# JavaScript/TypeScript
npx stryker run
```

**mutmut (Python)**
```bash
pip install mutmut
mutmut run
mutmut results
mutmut show <id>   # voir le mutant survivant
```

**PITest (Java)**
```bash
mvn org.pitest:pitest-maven:mutationCoverage
# rapport dans target/pit-reports/
```

Interprétation :
- **Score < 50 %** : assertions trop faibles, tests passent même avec du code cassé.
- **Score 50–70 %** : acceptable, améliorer les assertions des cas limites.
- **Score > 70 %** : bonne qualité de test.
- **Score 100 %** : probablement trop lent en CI, échantillonner par module.

---

### 7. Configurer les seuils CI/CD

**GitHub Actions — Jest / c8**
```yaml
- name: Test with coverage
  run: npx c8 --lines 80 --branches 70 --functions 90 npm test
  # Retourne exit code 1 si seuil non atteint
```

**.NET — coverlet avec seuil bloquant**
```bash
dotnet test /p:CollectCoverage=true \
  /p:CoverletOutputFormat=cobertura \
  /p:Threshold=80 \
  /p:ThresholdType=line
```

**Python — pytest-cov avec fail-under**
```bash
pytest --cov=src --cov-fail-under=80
```

**Diff coverage (ne pas régresser sur le nouveau code)** :
```bash
# diff-cover compare le coverage du diff courant vs main
pip install diff-cover
coverage xml
diff-cover coverage.xml --compare-branch=origin/main --fail-under=90
```

---

### 8. Visualisation et suivi dans le temps

- **Codecov** : intégration GitHub/GitLab, badge de couverture, commentaires PR automatiques.
- **Coveralls** : alternative légère pour projets open source.
- **SonarQube / SonarCloud** : coverage + code smells + duplication dans un seul dashboard.
- **ReportGenerator** (.NET) : rapport HTML local multi-projets avec tendances.

Configuration Codecov minimale (`.codecov.yml`) :
```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%   # tolérance de baisse acceptable
    patch:
      default:
        target: 90%     # nouveau code doit être bien couvert
```

---

## Garde-fous / Anti-patterns / Pièges

- **Chasing 100 %** : ajouter des tests sans assertion (`expect(true).toBe(true)`) pour gonfler la couverture. Résultat : couverture haute, qualité nulle. → Toujours coupler avec mutation testing.
- **Ignorer la branch coverage** : line coverage à 95 % mais les branches `catch` et `else` jamais exercées. → Configurer `--branches` en CI obligatoire.
- **Tests couplés à l'implémentation** : tester l'état interne plutôt que le comportement observable. Les refactorings cassent tous les tests. → Tester les contrats publics.
- **Seuils trop bas au départ** : configurer 30 % en CI parce que le projet est en retard. → Difficile à remonter ensuite. Mieux vaut démarrer à 60 % et incrémenter.
- **Coverage sur le code de test lui-même** : certains outils incluent les fichiers `*.spec.ts` dans le rapport. → Exclure explicitement via glob.
- **Oublier l'exclusion du code généré** : les migrations ou proto-generated files faussent les chiffres vers le bas. → Configurer les exclusions dès le départ.
- **Mutation testing en CI sur tout le projet** : trop lent. → Lancer en CI sur les fichiers modifiés uniquement, full run en nightly build.


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

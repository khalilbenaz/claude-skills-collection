---
name: testing-selenium-guide
description: Automatisation de tests avec Selenium WebDriver, couvrant les locators, les waits, le Page Object Model et Selenium Grid. Se déclenche avec "Selenium", "WebDriver", "test automatisé", "Page Object Model", "Selenium Grid"
---

# Selenium WebDriver Guide

## Workflow
1. **Configurer l'environnement Selenium** — Installer Selenium WebDriver pour le langage cible (Java, Python, C#). Configurer le WebDriverManager pour la gestion automatique des drivers navigateur. Définir les capabilities et options du navigateur.
2. **Choisir les locators appropriés** — Privilégier les locators stables : `id`, `name`, `data-testid`. Utiliser les CSS selectors pour la performance et XPath uniquement quand nécessaire. Éviter les locators basés sur la position ou le style.
3. **Implémenter les waits correctement** — Configurer un implicit wait global raisonnable. Utiliser des explicit waits (`WebDriverWait` + `ExpectedConditions`) pour les éléments dynamiques. Ne jamais mélanger implicit et explicit waits.
4. **Appliquer le Page Object Model** — Créer une classe par page ou composant majeur. Encapsuler les locators et les interactions dans des méthodes métier. Séparer la logique de test de la logique de navigation.
5. **Gérer les interactions complexes** — Utiliser `Actions` pour le drag-and-drop, hover et double-click. Gérer les iframes avec `switchTo().frame()`. Traiter les alertes, fenêtres multiples et onglets avec les méthodes appropriées.
6. **Structurer la suite de tests** — Organiser les tests avec un framework (TestNG, pytest, NUnit). Utiliser les annotations de setup/teardown pour initialiser et fermer le driver. Implémenter un reporting clair (Allure, ExtentReports).
7. **Configurer Selenium Grid pour le parallélisme** — Déployer un Hub et des Nodes pour l'exécution distribuée. Utiliser Docker Selenium pour simplifier l'infrastructure. Configurer les capabilities par navigateur et plateforme.
8. **Intégrer dans le pipeline CI/CD** — Exécuter les tests en mode headless dans le CI. Configurer la capture de screenshots en cas d'échec. Publier les rapports de test et gérer les artefacts.

## Règles
- Toujours fermer le WebDriver dans le teardown (`driver.quit()`) pour éviter les fuites de processus navigateur.
- Ne jamais utiliser `Thread.sleep()` ou des délais fixes ; utiliser exclusivement les waits explicites de Selenium.
- Appliquer systématiquement le Page Object Model pour tout projet dépassant une dizaine de tests afin de garantir la maintenabilité.
- Externaliser les données de test (fichiers CSV, JSON ou base de données) et ne jamais coder les données en dur dans les classes de test.
- Concevoir chaque test pour qu'il soit atomique et indépendant, sans dépendance d'ordre d'exécution.

---
name: testing-selenium-guide
description: Automatisation de tests avec Selenium WebDriver, couvrant les locators, les waits, le Page Object Model et Selenium Grid. Se déclenche avec "Selenium", "WebDriver", "test automatisé", "Page Object Model", "Selenium Grid. Also triggers on "flaky UI tests".
---

# Selenium WebDriver Guide

## 1. Configurer l'environnement

**Python (recommandé pour démarrer rapidement)**
```bash
pip install selenium webdriver-manager pytest pytest-html
```
```python
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

options = webdriver.ChromeOptions()
options.add_argument("--headless=new")   # headless pour CI
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)
driver.implicitly_wait(0)  # toujours 0 avec explicit waits
```

**Java (Maven)**
```xml
<dependency>
  <groupId>org.seleniumhq.selenium</groupId>
  <artifactId>selenium-java</artifactId>
  <version>4.21.0</version>
</dependency>
<dependency>
  <groupId>io.github.bonigarcia</groupId>
  <artifactId>webdrivermanager</artifactId>
  <version>5.9.1</version>
</dependency>
```

---

## 2. Choisir les locators — ordre de priorité

| Priorité | Stratégie | Exemple | Usage |
|----------|-----------|---------|-------|
| 1 | `data-testid` / `data-cy` | `[data-testid="submit-btn"]` | Stable, découplé du DOM |
| 2 | `id` | `#username` | Rapide si unique |
| 3 | `name` | `[name="email"]` | Formulaires |
| 4 | CSS selector | `.card > button.primary` | Performance |
| 5 | XPath | `//div[@role='dialog']//button` | En dernier recours |

```python
from selenium.webdriver.common.by import By

# Bon
el = driver.find_element(By.CSS_SELECTOR, "[data-testid='login-btn']")

# Acceptable
el = driver.find_element(By.XPATH, "//button[normalize-space()='Connexion']")

# Éviter
el = driver.find_element(By.XPATH, "/html/body/div[3]/div[1]/button")
```

---

## 3. Gérer les waits correctement

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

wait = WebDriverWait(driver, timeout=10)

# Attendre qu'un élément soit cliquable
btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='submit']")))
btn.click()

# Attendre la disparition d'un spinner
wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, ".loading-spinner")))

# Attendre un texte précis
wait.until(EC.text_to_be_present_in_element((By.ID, "status"), "Succès"))

# Custom condition (requête AJAX terminée)
wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
```

**Règle absolue** : `driver.implicitly_wait(0)` + explicit waits exclusivement. Ne jamais mélanger les deux.

---

## 4. Page Object Model (POM)

Structure de projet recommandée :
```
tests/
  pages/
    base_page.py
    login_page.py
    dashboard_page.py
  tests/
    test_login.py
  conftest.py
```

```python
# pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type(self, locator, text):
        el = self.wait.until(EC.visibility_of_element_located(locator))
        el.clear()
        el.send_keys(text)

# pages/login_page.py
from selenium.webdriver.common.by import By
from .base_page import BasePage

class LoginPage(BasePage):
    URL = "https://app.example.com/login"
    _USERNAME = (By.ID, "username")
    _PASSWORD = (By.ID, "password")
    _SUBMIT  = (By.CSS_SELECTOR, "[data-testid='login-btn']")
    _ERROR   = (By.CSS_SELECTOR, ".alert-error")

    def open(self):
        self.driver.get(self.URL)
        return self

    def login(self, user, pwd):
        self.type(self._USERNAME, user)
        self.type(self._PASSWORD, pwd)
        self.click(self._SUBMIT)
        return self

    def error_message(self):
        return self.wait.until(EC.visibility_of_element_located(self._ERROR)).text

# tests/test_login.py
def test_login_valide(driver):
    page = LoginPage(driver).open()
    page.login("admin@example.com", "secret")
    assert "dashboard" in driver.current_url

def test_login_invalide(driver):
    page = LoginPage(driver).open()
    page.login("bad@user.com", "wrong")
    assert "Identifiants incorrects" in page.error_message()
```

```python
# conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")
    drv = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    drv.set_window_size(1920, 1080)
    yield drv
    drv.quit()
```

---

## 5. Interactions complexes

```python
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

actions = ActionChains(driver)

# Hover + click sur sous-menu
actions.move_to_element(menu).pause(0.3).click(submenu).perform()

# Drag and drop
actions.drag_and_drop(source, target).perform()

# Upload de fichier (input file)
driver.find_element(By.CSS_SELECTOR, "input[type='file']").send_keys("/abs/path/file.pdf")

# Iframe
driver.switch_to.frame(driver.find_element(By.ID, "payment-iframe"))
# ... interactions dans l'iframe ...
driver.switch_to.default_content()

# Nouvelle fenêtre/onglet
original = driver.current_window_handle
driver.switch_to.window([h for h in driver.window_handles if h != original][0])
# ... actions dans le nouvel onglet ...
driver.close()
driver.switch_to.window(original)

# Alert
alert = wait.until(EC.alert_is_present())
alert.accept()    # ou alert.dismiss() / alert.send_keys(...)
```

---

## 6. Selenium Grid — exécution distribuée

**Démarrage rapide avec Docker Compose :**
```yaml
# docker-compose.yml
services:
  selenium-hub:
    image: selenium/hub:4.21
    ports: ["4442:4442", "4443:4443", "4444:4444"]

  chrome:
    image: selenium/node-chrome:4.21
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
      SE_NODE_MAX_SESSIONS: "4"
    volumes:
      - /dev/shm:/dev/shm
    deploy:
      replicas: 3

  firefox:
    image: selenium/node-firefox:4.21
    depends_on: [selenium-hub]
    environment:
      SE_EVENT_BUS_HOST: selenium-hub
```
```bash
docker compose up -d
# Dashboard : http://localhost:4444/ui
```

```python
# Connexion au Grid depuis les tests
from selenium.webdriver.remote.webdriver import WebDriver as RemoteDriver

options = webdriver.ChromeOptions()
driver = RemoteDriver(
    command_executor="http://localhost:4444/wd/hub",
    options=options
)
```

**pytest-xdist pour la parallélisation :**
```bash
pip install pytest-xdist
pytest -n 4 tests/          # 4 workers en parallèle
```

---

## 7. Intégration CI/CD

```yaml
# .github/workflows/selenium.yml (GitHub Actions)
jobs:
  selenium:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: pytest tests/ --html=report.html --self-contained-html -v
        env:
          HEADLESS: "true"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: selenium-report
          path: |
            report.html
            screenshots/
```

**Screenshot automatique à l'échec :**
```python
# conftest.py
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        driver = item.funcargs.get("driver")
        if driver:
            driver.save_screenshot(f"screenshots/{item.name}.png")
```

---

## 8. Garde-fous et anti-patterns

| Anti-pattern | Impact | Correction |
|---|---|---|
| `time.sleep(3)` | Tests lents et fragiles | `WebDriverWait` + `ExpectedConditions` |
| `implicitly_wait` + `WebDriverWait` simultanés | Timeouts imprévisibles | `implicitly_wait(0)` partout |
| Locators sur le texte brut affiché | Casse à la moindre traduction | `data-testid` ou attributs sémantiques |
| `driver.find_elements(...)[0]` sans vérification | `IndexError` silencieux | Vérifier `.is_displayed()` + longueur |
| Tests avec état partagé (session/cookie) | Flakiness entre tests | Reset complet dans le teardown ou `driver.delete_all_cookies()` |
| Assertions dans les Page Objects | Mélange responsabilités | PO = navigation ; test = assertion |
| XPath absolu (`/html/body/div[2]/...`) | Fragile au moindre refactor HTML | CSS selector ou XPath relatif |

**Pièges fréquents :**
- **StaleElementReferenceException** : l'élément a été rechargé par le JS ; ré-interroger le DOM après chaque action qui déclenche un re-render.
- **ElementClickInterceptedException** : un overlay masque l'élément ; `wait.until(EC.invisibility_of_element_located(...))` sur l'overlay avant de cliquer.
- **Flaky en headless** : résolution par défaut 800×600 ; toujours fixer `driver.set_window_size(1920, 1080)`.
- **Selenium 4 BiDi** : pour écouter les events réseau (`driver.execute_cdp_cmd(...)`) sans proxy externe.

---

## Critères de décision — Selenium vs alternatives

| Besoin | Outil conseillé |
|--------|----------------|
| Tests multi-navigateurs (Chrome, Firefox, Safari, Edge) | **Selenium** |
| Tests uniquement Chromium/Firefox, setup rapide | Playwright |
| Tests composants React/Vue isolés | Cypress Component Testing |
| Mobile natif (Android/iOS) | Appium (basé sur WebDriver) |
| Performance / charge | k6, Gatling |


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

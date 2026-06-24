---
name: arduino-project-guide
description: Développement de projets Arduino avec circuits, capteurs, code et communication série. Se déclenche avec "Arduino", "capteur", "servo", "GPIO", "circuit Arduino", "sketch".
---

# Arduino Project Guide

## 1. Analyse du besoin

Identifier avant tout :
- **Type de projet** : lecture périodique (température, humidité), événementiel (bouton, détecteur PIR), temps réel (servo, PID)
- **Contraintes alimentation** : USB (debug), batterie 3.7V LiPo, secteur 5V
- **Communication** : local seulement, WiFi, BLE, LoRa, UART vers RPi

Critères de sélection de carte :

| Besoin | Carte recommandée |
|--------|-------------------|
| Prototype simple, 5V | Arduino Uno / Nano |
| Nombreuses broches | Arduino Mega 2560 |
| WiFi intégré | ESP8266 (NodeMCU) / ESP32 |
| Faible conso batterie | Arduino Pro Mini 3.3V / ESP32 deep sleep |
| BLE + WiFi | ESP32 DevKit |

---

## 2. Conception du circuit

**Avant de câbler :**
- Vérifier la tension logique (3.3V ESP32 vs 5V Uno — diviseur résistif ou level shifter si mixte)
- Ajouter une résistance pull-up/pull-down sur chaque entrée numérique non pilotée (typique : 10kΩ)
- Protéger les sorties LED : R = (Vcc - Vled) / Iled, ex. 5V, LED 2V, 20mA → R = 150Ω

**Règle des broches :**
```
Analog  → A0–A5 (lecture ADC 10 bits, 0–1023)
PWM     → 3, 5, 6, 9, 10, 11 (Uno) — marque ~ sur la carte
I2C     → A4 (SDA), A5 (SCL)
SPI     → 10 (SS), 11 (MOSI), 12 (MISO), 13 (SCK)
UART    → 0 (RX), 1 (TX) — éviter pendant l'upload
```

**Capacité de découplage** : 100nF céramique sur VCC/GND de chaque CI sensible (capteur I2C, module RF).

---

## 3. Structure du sketch

Template minimal opérationnel :

```cpp
#include <Wire.h>          // I2C
// #include <SPI.h>        // SPI
// #include <SoftwareSerial.h>

// --- Constantes ---
const uint8_t PIN_LED   = 13;
const uint8_t PIN_BTN   = 2;   // interrupt-capable sur Uno
const unsigned long INTERVAL_MS = 1000;

// --- Variables globales (volatile si ISR) ---
volatile bool eventFlag = false;
unsigned long lastMillis = 0;

// --- ISR ---
void onButton() {
  eventFlag = true;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BTN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_BTN), onButton, FALLING);
  Wire.begin();
}

void loop() {
  unsigned long now = millis();

  // Tâche périodique non-bloquante (jamais de delay() en prod)
  if (now - lastMillis >= INTERVAL_MS) {
    lastMillis = now;
    readSensors();
    publishData();
  }

  // Traitement événement ISR
  if (eventFlag) {
    eventFlag = false;
    handleButton();
  }
}
```

**Règle : ne jamais bloquer `loop()`** — remplacer `delay(x)` par le pattern `millis()`.

---

## 4. Capteurs courants — snippets copiables

### DHT22 (température + humidité)
```cpp
#include <DHT.h>
DHT dht(4, DHT22);
// setup: dht.begin();
float t = dht.readTemperature();
float h = dht.readHumidity();
if (isnan(t) || isnan(h)) { Serial.println("DHT error"); return; }
```

### HC-SR04 (ultrason)
```cpp
long getDistance(uint8_t trig, uint8_t echo) {
  digitalWrite(trig, LOW); delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long dur = pulseIn(echo, HIGH, 30000UL); // timeout 30ms
  return dur * 0.034 / 2; // cm
}
```

### Servo
```cpp
#include <Servo.h>
Servo srv;
// setup: srv.attach(9);
srv.write(90); // 0–180°
```

### I2C scan (debug)
```cpp
for (uint8_t addr = 1; addr < 127; addr++) {
  Wire.beginTransmission(addr);
  if (Wire.endTransmission() == 0)
    Serial.println(addr, HEX);
}
```

---

## 5. Communication série et débogage

```cpp
Serial.begin(115200);
Serial.print("T="); Serial.print(t); Serial.print("°C H="); Serial.println(h);
```

**Moniteur série** : menu `Outils > Moniteur série`, baud rate identique au sketch.

**Plotter série** : `Outils > Traceur série` — affiche les valeurs numériques en graphe temps réel.

Macro de debug conditionnel (0 overhead en production) :
```cpp
#define DEBUG 1
#if DEBUG
  #define DBG(x) Serial.println(x)
#else
  #define DBG(x)
#endif
```

---

## 6. Gestion mémoire (SRAM limitée)

Arduino Uno : 2 Ko SRAM, 32 Ko Flash.

```cpp
// Stocker les strings en Flash, pas en SRAM
Serial.println(F("Démarrage OK"));

// Vérifier la SRAM libre
int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}
```

Si `freeRam() < 100` : risque de crash — passer sur Mega ou ESP32.

---

## 7. Optimisation énergie (batterie)

```cpp
#include <avr/sleep.h>
// Mettre l'Uno en sleep entre lectures
set_sleep_mode(SLEEP_MODE_PWR_DOWN);
sleep_enable();
sleep_cpu(); // réveil par interrupt

// ESP32 deep sleep (µA)
esp_sleep_enable_timer_wakeup(30e6); // 30s
esp_deep_sleep_start();
```

Consommation indicative :
- Uno actif : ~50 mA | sleep : ~35 µA avec watchdog
- ESP32 actif : ~240 mA | deep sleep : ~10 µA

---

## 8. Anti-patterns / Pièges

| Piège | Correction |
|-------|-----------|
| `delay()` dans `loop()` | Pattern `millis()` non-bloquant |
| Variables ISR non `volatile` | Toujours déclarer `volatile` |
| Courant LED sans résistance | Calcul R obligatoire (→ brûle la broche) |
| ESP32 I/O à 5V direct | Diviseur résistif ou level shifter 3.3V |
| `String` dynamique sur Uno | Utiliser `char[]` + `snprintf()` — `String` fragmente la SRAM |
| Lire `analogRead()` sans stabilisation | Faire un premier `analogRead()` factice après changement de pin |
| Upload bloqué par Serial sur pins 0/1 | Utiliser `SoftwareSerial` sur d'autres pins |
| Lib manquante = erreur cryptique | Gestionnaire de bibliothèques : `Ctrl+Shift+I` |

---

## 9. Bonnes pratiques 2026

- **PlatformIO** (VS Code) plutôt qu'Arduino IDE pour les projets > 1 fichier : gestion de dépendances, multi-targets, CI possible.
- **Schéma** : utiliser Fritzing ou Wokwi (simulation en ligne) avant de câbler physiquement.
- **Versionner** le sketch dans Git (`.gitignore` : `build/`, `.pio/`).
- **Tests** : avec PlatformIO + Unity, tester la logique métier hors matériel (native env).
- **OTA** : sur ESP32/ESP8266, prévoir `ArduinoOTA` dès le départ pour les mises à jour sans fil.

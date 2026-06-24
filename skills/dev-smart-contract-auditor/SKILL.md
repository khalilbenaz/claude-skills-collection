---
name: dev-smart-contract-auditor
description: Audit de sécurité de smart contracts Solidity et blockchain. Se déclenche avec "smart contract", "Solidity", "audit blockchain", "vulnérabilité smart contract", "reentrancy", "ERC-20", "ERC-721", "Web3 security".
---

# Smart Contract Auditor

## Workflow d'audit

### 1. Cartographie du périmètre

Avant toute analyse de code, délimiter précisément la surface d'attaque :

```bash
# Compter les lignes Solidity hors tests
find . -name "*.sol" ! -path "*/test*" ! -path "*/node_modules*" | xargs wc -l | sort -rn

# Lister les contrats upgradeable (proxy pattern)
grep -rl "UUPSUpgradeable\|TransparentUpgradeableProxy\|BeaconProxy" contracts/
```

Critères de décision sur la profondeur :
- < 500 SLOC → audit complet manuel en une session
- 500–3000 SLOC → découpage par module, prioriser les contrats porteurs de fonds
- > 3000 SLOC → focus sur invariants critiques + outils automatisés en premier

### 2. Analyse statique automatisée

Lancer systématiquement avant toute revue manuelle :

```bash
# Slither — détection patterns vulnérables
slither . --checklist --json slither-report.json

# Mythril — analyse symbolique (fonctions critiques)
myth analyze contracts/Vault.sol --execution-timeout 120 --solv 0.8.24

# Aderyn (2024+) — alternative Rust, plus rapide sur gros repos
aderyn . --output report.md
```

Trier les findings Slither par impact : ignorer `low` et `informational` en premier passage, se concentrer sur `high` et `medium`.

### 3. Vérification des vulnérabilités critiques

**Reentrancy** — pattern CEI (Checks-Effects-Interactions) obligatoire :

```solidity
// VULNERABLE
function withdraw(uint amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok,) = msg.sender.call{value: amount}(""); // appel externe AVANT mise à jour
    balances[msg.sender] -= amount;
}

// CORRECT
function withdraw(uint amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount; // état mis à jour EN PREMIER
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
}
```

**Access control** — vérifier chaque fonction `external`/`public` :

```solidity
// Checklist : toute fonction modifiant l'état a-t-elle un modifier ?
// Slither détecte : slither . --detect missing-zero-check,suicidal,unprotected-upgrade
```

**Flash loan / price manipulation** :
- Toute lecture de prix on-chain via `getReserves()` sans TWAP est exploitable
- Utiliser Chainlink ou Uniswap V3 TWAP (30 min minimum)

**Signature replay** :
- Vérifier présence de `nonce` + `block.chainid` dans chaque `ecrecover`
- EIP-712 est obligatoire pour tout mécanisme de permit/meta-tx

**Overflow (Solidity < 0.8)** :
- Tout contrat < 0.8.x sans SafeMath est suspect ; chercher `pragma solidity ^0.7`

### 4. Analyse des standards ERC

```bash
# Vérifier conformité ERC-20 avec Foundry
forge test --match-contract ERC20Compliance -vvv

# OpenZeppelin Wizard — base safe à utiliser comme référence
# https://wizard.openzeppelin.com/
```

Points de contrôle ERC-20 : `transfer` retourne `bool`, `approve` + `transferFrom` atomique, events `Transfer`/`Approval` émis. ERC-721 : `safeTransferFrom` gère `IERC721Receiver`, `tokenURI` ne doit pas revert sur token inexistant.

### 5. Tests et fuzzing avec Foundry

```bash
# Lancer les tests en mode fork mainnet
forge test --fork-url $ETH_RPC_URL --fork-block-number 20000000 -vvv

# Fuzzing d'une fonction critique (définir un invariant)
# Dans le fichier de test Foundry :
```

```solidity
// test/VaultFuzz.t.sol
contract VaultFuzzTest is Test {
    Vault vault;

    function setUp() public { vault = new Vault(); }

    // Invariant : la balance du contrat >= somme des dépôts utilisateurs
    function invariant_solvency() public view {
        assertGe(address(vault).balance, vault.totalDeposits());
    }
}
```

```bash
forge test --match-contract VaultFuzzTest --fuzz-runs 10000
```

### 6. Vérification gas et storage

```bash
forge snapshot --diff                    # comparer avant/après optimisation
forge test --gas-report                  # rapport détaillé par fonction
```

Règles d'optimisation sûres :
- `constant`/`immutable` pour toute valeur fixée au déploiement
- `uint256` par défaut (éviter `uint8` en storage, coûteux via masking)
- Regrouper les variables storage pour packing (max 32 bytes par slot)
- `calldata` vs `memory` pour les paramètres de fonctions `external`

**Ne jamais sacrifier la sécurité pour le gas** : toute économie < 5000 gas sur une fonction critique ne justifie pas de supprimer un `nonReentrant`.

### 7. Rapport de findings

Chaque finding suit ce template :

```
## [CRIT-01] Reentrancy dans `withdraw()`

**Sévérité** : Critical
**Contrat** : Vault.sol, ligne 42
**Impact** : Drain total des fonds du contrat
**Reproductibilité** : 100%

### PoC
[code Solidity ou séquence d'appels reproductible]

### Recommandation
Appliquer le pattern CEI + modificateur `nonReentrant` d'OpenZeppelin.

### Statut
[ ] Non corrigé  [ ] Corrigé  [ ] Accepté (risque assumé)
```

Niveaux de sévérité :
| Niveau | Critère |
|--------|---------|
| Critical | Perte de fonds, drain total possible |
| High | Perte partielle ou blocage permanent |
| Medium | Comportement inattendu, contournement de règle métier |
| Low | Bonne pratique non respectée, risque faible |
| Info | Qualité de code, optimisation |

---

## Garde-fous et anti-patterns

- **Ne jamais utiliser `tx.origin`** pour l'authentification — utiliser `msg.sender`
- **`block.timestamp`** manipulable par les mineurs à ±15s — ne pas baser de logique critique dessus
- **`delegatecall` vers une adresse contrôlable** → takeover de storage immédiat
- **`selfdestruct`** suivi d'un `CREATE2` au même address → contournement de whitelist
- **Proxies upgradeable** : vérifier que l'implémentation n'a pas de constructeur avec état, et que `initialize()` est protégé contre double-appel (`initializer` modifier)
- **Randomness on-chain** (`blockhash`, `block.difficulty`) : trivialmente manipulable — utiliser Chainlink VRF
- **Boucles sur des arrays dynamiques** sans borne maximale → DoS par gas limit
- **Retour de `call()` non vérifié** : toujours `require(ok, "call failed")`

## Outils de référence (2026)

| Outil | Usage | Commande rapide |
|-------|-------|-----------------|
| Slither | Analyse statique | `slither . --checklist` |
| Foundry | Tests + fuzzing | `forge test --fuzz-runs 5000` |
| Aderyn | Analyse statique Rust | `aderyn .` |
| Echidna | Fuzzing basé propriétés | `echidna-test . --contract MyContract` |
| Mythril | Analyse symbolique | `myth analyze file.sol` |
| Certora | Vérification formelle | `certoraRun spec.conf` |
| Tenderly | Simulation fork + debug | UI + CLI |


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

---
name: web3-dapp-builder
description: Développement d'applications décentralisées (dApps) Web3. Se déclenche avec "dApp", "Web3", "blockchain app", "ethers.js", "wagmi", "Hardhat", "Foundry", "MetaMask", "wallet connect". Also triggers on "build a dApp", "connect a wallet", "smart contract frontend".
---

# Web3 dApp Builder

## Critères de décision : stack recommandée (2026)

| Besoin | Recommandation |
|---|---|
| Smart contracts Solidity | **Foundry** (tests rapides, fork mainnet natif) |
| Scripts de déploiement complexes | Hardhat + `hardhat-deploy` ou Foundry `script/` |
| Frontend wallet | **wagmi v2 + viem** (remplace ethers.js v5) |
| Multi-wallet | **RainbowKit** ou ConnectKit sur WalletConnect v2 |
| Indexation événements | **The Graph** (subgraph) ou **Ponder** (self-hosted, TypeScript) |
| Monitoring/alertes | **OpenZeppelin Defender 2.0** ou **Tenderly** |
| Chaîne L2 | Base, Arbitrum, Optimism selon volume/coût gas |
| Account Abstraction | **ERC-4337** + Pimlico/Biconomy Bundler |

---

## Workflow en étapes

### 1. Initialiser le projet

```bash
# Monorepo recommandé (contracts + frontend séparés)
mkdir my-dapp && cd my-dapp
pnpm init

# Foundry pour les contracts
forge init contracts --no-git
cd contracts && forge install OpenZeppelin/openzeppelin-contracts

# Frontend Next.js + wagmi
pnpm create next-app frontend --typescript
cd frontend
pnpm add wagmi viem @tanstack/react-query
pnpm add @rainbow-me/rainbowkit
```

Fichier `wagmi.config.ts` minimal :

```typescript
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, base } from 'wagmi/chains'

export const config = createConfig({
  chains: [mainnet, sepolia, base],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_MAINNET),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA),
    [base.id]: http(process.env.NEXT_PUBLIC_ALCHEMY_BASE),
  },
})
```

---

### 2. Développer les smart contracts

Structure Foundry recommandée :

```
contracts/
├── src/
│   └── MyToken.sol
├── script/
│   └── Deploy.s.sol
├── test/
│   └── MyToken.t.sol
└── foundry.toml
```

Snippet `Deploy.s.sol` :

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {MyToken} from "../src/MyToken.sol";

contract DeployScript is Script {
    function run() external returns (MyToken) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        MyToken token = new MyToken(msg.sender);
        vm.stopBroadcast();
        return token;
    }
}
```

```bash
# Déploiement sur Sepolia
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast --verify
```

---

### 3. Générer et consommer l'ABI côté frontend

```bash
# Copie ABI automatique après build
forge build
cp out/MyToken.sol/MyToken.json ../frontend/src/abi/
```

Hook wagmi typé (`useReadContract`) :

```typescript
import { useReadContract, useWriteContract } from 'wagmi'
import { MyTokenABI } from '@/abi/MyToken.json'

const TOKEN_ADDRESS = '0x...' as const

// Lecture
export function useTokenBalance(address: `0x${string}`) {
  return useReadContract({
    address: TOKEN_ADDRESS,
    abi: MyTokenABI,
    functionName: 'balanceOf',
    args: [address],
  })
}

// Écriture avec gestion d'état complète
export function useTransfer() {
  const { writeContract, isPending, isSuccess, error } = useWriteContract()

  function transfer(to: `0x${string}`, amount: bigint) {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: MyTokenABI,
      functionName: 'transfer',
      args: [to, amount],
    })
  }

  return { transfer, isPending, isSuccess, error }
}
```

---

### 4. Wallet integration (RainbowKit)

```tsx
// app/providers.tsx
'use client'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/wagmi.config'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

Gestion du réseau incorrect :

```typescript
import { useSwitchChain, useChainId } from 'wagmi'
import { base } from 'wagmi/chains'

function NetworkGuard({ children }) {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  if (chainId !== base.id) {
    return (
      <button onClick={() => switchChain({ chainId: base.id })}>
        Switch to Base
      </button>
    )
  }
  return children
}
```

---

### 5. Indexation avec The Graph (subgraph)

```bash
graph init --studio my-subgraph
```

`schema.graphql` minimal :

```graphql
type Transfer @entity(immutable: true) {
  id: Bytes!
  from: Bytes!
  to: Bytes!
  value: BigInt!
  blockTimestamp: BigInt!
}
```

Query côté frontend :

```typescript
const TRANSFERS_QUERY = `{
  transfers(first: 20, orderBy: blockTimestamp, orderDirection: desc) {
    id from to value blockTimestamp
  }
}`

const { data } = await fetch(SUBGRAPH_URL, {
  method: 'POST',
  body: JSON.stringify({ query: TRANSFERS_QUERY }),
}).then(r => r.json())
```

---

### 6. Tests Foundry

```solidity
// test/MyToken.t.sol
contract MyTokenTest is Test {
    MyToken token;
    address alice = makeAddr("alice");

    function setUp() public {
        token = new MyToken(address(this));
        token.transfer(alice, 100e18);
    }

    // Fork test mainnet
    function testFork_SwapOnUniswap() public {
        vm.createSelectFork(vm.envString("MAINNET_RPC"), 19_000_000);
        // ... interactions avec Uniswap réel
    }

    function test_transferFailsWithoutBalance() public {
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(address(this), 999e18);
    }
}
```

```bash
forge test -vvv
forge coverage --report lcov
```

---

### 7. Déploiement multi-chaîne

Fichier `deploy.sh` :

```bash
#!/bin/bash
CHAINS=("mainnet" "base" "arbitrum")
for chain in "${CHAINS[@]}"; do
  forge script script/Deploy.s.sol \
    --rpc-url $(eval echo \$${chain^^}_RPC) \
    --broadcast --verify \
    --etherscan-api-key $(eval echo \$${chain^^}_ETHERSCAN_KEY)
done
```

---

## Sécurité — garde-fous obligatoires

| Risque | Mesure |
|---|---|
| Reentrancy | `ReentrancyGuard` d'OpenZeppelin sur toutes les fonctions `external` qui transfèrent de l'ETH |
| Overflow | Solidity ≥ 0.8 (built-in checks) ; éviter `unchecked` sauf optimisation validée |
| Access control | `Ownable2Step` (OZ) — éviter `Ownable` simple (transfert en 2 étapes) |
| Signature replay | Inclure `chainId` + `nonce` dans EIP-712 domain separator |
| Oracle manipulation | Ne pas utiliser `block.timestamp` comme source de randomness ; utiliser Chainlink VRF |
| Proxy storage collision | UUPS : toujours héritage via `UUPSUpgradeable`, pas de constructeur, `initializer` protégé |
| Front-running | Commit-reveal ou slippage tolerance explicite sur les swaps |
| Private key leak | Jamais de clé privée dans `.env` commité ; utiliser `--ledger` en mainnet |

---

## Anti-patterns fréquents

- **Ne jamais** utiliser `transfer()` ou `send()` pour envoyer de l'ETH — préférer `call{value:}("")` avec vérification du retour.
- **Ne pas** stocker des données volumineuses on-chain (coût gas prohibitif) — utiliser IPFS/Arweave + stocker uniquement le CID/hash.
- **Éviter** les boucles non bornées (`for (uint i = 0; i < array.length; i++)`) — risque de block gas limit.
- **Ne pas** exposer la clé privée dans les scripts front — les interactions sensibles passent toujours par le wallet utilisateur.
- **wagmi v1 est déprécié** — migrer vers v2 (API `useReadContract`/`useWriteContract` remplace `useContractRead`/`useContractWrite`).
- **ethers.js v5 est en maintenance** — préférer viem ou ethers.js v6 pour les nouveaux projets.
- **Ne pas** skipper la vérification du contrat sur Etherscan — les utilisateurs ne feront pas confiance à un proxy non vérifié.

---

## Bonnes pratiques 2026

- Utiliser **Solidity 0.8.25+** (MCOPY opcode, transient storage EIP-1153).
- Préférer **viem** à ethers.js pour la manipulation de types (bigint natif, ABI encoding type-safe).
- Activer **Slither** en CI pour l'analyse statique : `slither src/ --exclude-dependencies`.
- Utiliser **OpenZeppelin Contracts 5.x** (breaking changes vs 4.x : `Ownable` constructeur, ERC20Permit intégré).
- Pour les dApps DeFi : toujours tester avec un **fork mainnet** avant testnet pour avoir les vraies liquidités.
- **EIP-6963** (multi-wallet discovery) est supporté par wagmi v2 — activer pour une meilleure DX multi-wallet.
- Documenter toutes les adresses de contrat déployées dans un fichier `deployments/<chainId>.json` versionné.

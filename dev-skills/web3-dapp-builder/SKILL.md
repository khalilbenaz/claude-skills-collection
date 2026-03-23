---
name: web3-dapp-builder
description: Développement d'applications décentralisées (dApps) Web3. Se déclenche avec "dApp", "Web3", "blockchain app", "ethers.js", "wagmi", "Hardhat", "Foundry", "MetaMask", "wallet connect".
---

# Web3 dApp Builder

## Workflow

1. **Architecture dApp** : Définir la séparation entre logique on-chain et off-chain, concevoir l'architecture des smart contracts, le frontend React/Next.js, le backend éventuel, et les couches d'indexation (The Graph, Alchemy) selon les besoins du projet.

2. **Smart contract development** : Développer les contrats en Solidity avec Hardhat ou Foundry, écrire les scripts de déploiement et de migration, vérifier les contrats sur Etherscan/block explorers, et gérer les ABIs et addresses par réseau.

3. **Frontend Web3** : Intégrer wagmi et viem (ou ethers.js v6) pour les interactions blockchain, gérer les états de transaction (pending, success, error), afficher les données on-chain en temps réel, et implémenter la gestion des erreurs utilisateur.

4. **Wallet integration** : Connecter MetaMask et autres wallets via WalletConnect v2, gérer le multi-chain et les changements de réseau, implémenter Account Abstraction (ERC-4337) si nécessaire, et sécuriser la gestion des signatures (EIP-712, personal_sign).

5. **Indexing et data** : Créer des subgraphs avec The Graph pour indexer les événements on-chain, utiliser Alchemy ou Moralis pour les données enrichies, mettre en place l'écoute d'events en temps réel, et gérer le cache des données blockchain.

6. **Testing** : Écrire des tests unitaires complets avec Foundry (forge test), déployer sur testnets (Sepolia, Mumbai), effectuer des fork tests sur mainnet pour les intégrations DeFi, et tester l'ensemble du flux utilisateur end-to-end.

7. **Security** : Valider toutes les entrées côté smart contract, implémenter la vérification de signatures EIP-712, ajouter les reentrancy guards, utiliser les patterns upgradeable (UUPS/Transparent Proxy) avec précaution, et auditer avant tout déploiement mainnet.

8. **Déploiement** : Déployer sur plusieurs chaînes avec des scripts unifiés, utiliser les proxy patterns pour l'upgradabilité, héberger le frontend sur IPFS/Fleek ou Vercel, configurer les ENS pour une résolution d'adresse conviviale, et monitorer avec Tenderly ou OpenZeppelin Defender.

## Règles

- Fournis des exemples de code fonctionnels avec wagmi/viem et Solidity pour chaque fonctionnalité demandée.
- Adapte les recommandations à la chaîne cible (Ethereum, Polygon, Arbitrum, Base) et à ses spécificités.
- Priorise la sécurité des interactions wallet et la validation on-chain avant toute optimisation d'expérience utilisateur.
- Mentionne systématiquement les outils recommandés : Hardhat, Foundry, wagmi, The Graph, Alchemy, OpenZeppelin.
- Inclus toujours la gestion des erreurs et les états de chargement dans les exemples de code frontend Web3.

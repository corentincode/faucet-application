# ERC-20 Token Faucet

Un portail web moderne et réactif permettant aux utilisateurs de demander des jetons ERC-20 de test sur le réseau Polygon Amoy. Construit avec Next.js, Wagmi v2 et Tailwind CSS.

## Fonctionnalités

- 🔗 Connexion avec n'importe quel portefeuille Ethereum via Wagmi
- 🪙 Demande de jetons de test avec montants personnalisables
- 📊 Affichage du solde de jetons et des limites d'utilisation quotidiennes
- 🔄 Mises à jour en temps réel du statut des transactions
- 🌓 Interface utilisateur moderne avec design glassmorphique
- 📱 Entièrement responsive sur tous les appareils

## Technologies

- **Frontend**: Next.js 14, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Web3**: Wagmi v2, Viem
- **Smart Contract**: Solidity (ERC-20 avec fonctionnalité de faucet)
- **Composants UI**: Radix UI, icônes Lucide React

## Installation

### Prérequis

- Node.js 18+ et npm/yarn
- MetaMask ou tout autre portefeuille Ethereum
- Accès au réseau de test Polygon Amoy

### Configuration

1. Installez les dépendances :

```bash
npm install
# ou
yarn install
```

2. Configurez l'adresse du jeton :

Créez un fichier `.env` à la racine du projet :
```bash
NEXT_PUBLIC_TOKEN_ADDRESS="YOUR_TOKEN_CONTRACT_ADRESS"
```

3. Démarrez le serveur de développement :

```bash
npm run dev
# ou
yarn dev
```

Ouvrez : http://localhost:3000

## Déploiement du Smart Contract

Le faucet nécessite un contrat de jeton ERC-20 avec des fonctionnalités de mint supplémentaires. Suivez ces étapes pour déployer le vôtre :

1. Installez Forge (si ce n'est pas déjà fait) :

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Compilez le contrat :

```bash
forge build
```

3. Déployez sur le réseau de test Polygon Amoy :

```bash
forge create --rpc-url https://rpc-amoy.polygon.technology/ --private-key VOTRE_CLE_PRIVEE src/TokenWithFaucet.sol:TokenWithFaucet --constructor-args "Votre Jeton" "VTK" 18
```

## Utilisation

1. Connectez votre portefeuille en cliquant sur le bouton "Connect Wallet".
2. Une fois connecté, vous verrez votre solde actuel de jetons et votre utilisation quotidienne.
3. Utilisez le curseur ou le champ de saisie pour sélectionner le montant de jetons que vous souhaitez demander.
4. Cliquez sur "Request" pour initier la transaction.
5. Approuvez la transaction dans votre portefeuille.
6. Attendez que la transaction soit confirmée sur la blockchain.
7. Votre solde mis à jour s'affichera automatiquement.

## Structure du Projet

```bash
├── app/                  # Répertoire Next.js app
│   ├── globals.css       # Styles globaux
│   ├── layout.tsx        # Layout racine
│   ├── page.tsx          # Composant de page principale
│   └── providers.tsx     # Fournisseurs Wagmi
├── components/           # Composants React
│   ├── connect-button.tsx  # Bouton de connexion au portefeuille
│   ├── faucet-form.tsx     # Formulaire de demande de jetons
│   ├── token-info.tsx      # Affichage des informations sur les jetons
│   └── ui/                 # Composants UI
├── lib/                  # Fonctions utilitaires et constantes
│   ├── constants.ts      # Constantes de l'application
│   ├── token-abi.ts      # ABI du jeton
│   └── utils.ts          # Fonctions utilitaires
└── public/               # Ressources statiques
```
## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à soumettre une Pull Request.

1. Forkez le dépôt
2. Créez votre branche de fonctionnalité (`git checkout -b feature/fonctionnalite-incroyable`)
3. Committez vos changements (`git commit -m 'Ajout d'une fonctionnalité incroyable'`)
4. Poussez vers la branche (`git push origin feature/fonctionnalite-incroyable`)
5. Ouvrez une Pull Request


## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

# CRA Aubay - Extension VSCode

Extension VSCode pour CRA Aubay.

## Développement

### Prérequis

- Node.js
- npm ou yarn

### Installation

```bash
yarn install
```

### Compilation

```bash
yarn compile
```

### Test rapide de l'extension

**Méthode 1 : Avec F5 (recommandée pour le débogage)**

1. Ouvrir ce projet dans VSCode
2. S'assurer que le code est compilé : `yarn compile`
3. Appuyer sur `F5` pour lancer une nouvelle fenêtre VSCode avec l'extension chargée
4. Dans la nouvelle fenêtre, ouvrir la palette de commandes (`Cmd+Shift+P` sur Mac, `Ctrl+Shift+P` sur Windows/Linux)
5. Taper "Hello World" pour exécuter la commande

**Méthode 2 : Depuis le terminal (rapide)**

```bash
yarn compile  # Compiler le code si nécessaire
yarn test     # Lance une nouvelle fenêtre VSCode avec l'extension chargée
```

Puis dans la nouvelle fenêtre, utiliser la palette de commandes pour tester l'extension.

### Gestion de version

Pour incrémenter automatiquement le numéro de version :

```bash
yarn version          # Incrémente la version patch (0.0.1 → 0.0.2)
yarn version:patch    # Incrémente la version patch (0.0.1 → 0.0.2)
yarn version:minor    # Incrémente la version minor (0.0.1 → 0.1.0)
yarn version:major    # Incrémente la version major (0.0.1 → 1.0.0)
```

### Packaging

Pour créer un fichier `.vsix` à distribuer :

```bash
yarn package
```

Le fichier `.vsix` sera créé dans le dossier `build/` (ex: `build/cra-aubay-0.0.7.vsix`).

### Release (version + package)

Pour incrémenter la version et créer le package `.vsix` en une seule commande :

```bash
yarn release          # Incrémente patch + crée le .vsix
yarn release:patch     # Incrémente patch + crée le .vsix
yarn release:minor     # Incrémente minor + crée le .vsix
yarn release:major     # Incrémente major + crée le .vsix
```

### Installation de l'extension

**Méthode 1 : Via la palette de commandes (recommandée)**

1. Ouvrir VSCode
2. Ouvrir la palette de commandes (`Cmd+Shift+P` sur Mac, `Ctrl+Shift+P` sur Windows/Linux)
3. Taper "Extensions: Install from VSIX..."
4. Sélectionner le fichier `.vsix` dans le dossier `build/` (ex: `build/cra-aubay-0.0.9.vsix`)

**Méthode 2 : Via la ligne de commande**

```bash
code --install-extension build/cra-aubay-0.0.9.vsix
```

Ou depuis le dossier du projet :

```bash
code --install-extension ./build/cra-aubay-0.0.9.vsix
```

**Méthode 3 : Glisser-déposer**

Glisser le fichier `.vsix` directement dans la fenêtre VSCode.

**Méthode 4 : Script automatique**

```bash
npm run install
```

Ce script installe automatiquement le dernier fichier `.vsix` créé dans le dossier `build/`.

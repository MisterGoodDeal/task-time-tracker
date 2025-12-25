# Référence des Icônes VSCode (Codicons)

## Ressources principales

1. **Site officiel** : https://microsoft.github.io/vscode-codicons/dist/codicon.html
2. **GitHub** : https://github.com/microsoft/vscode-codicons
3. **Extension** : "Codicons Preview" dans le marketplace VSCode

## Utilisation dans le code

```typescript
// Dans un TreeItem
iconPath = new vscode.ThemeIcon("git-branch");

// Dans package.json (commandes)
"icon": "$(git-branch)"
```

## Icônes courantes par catégorie

### Git

- `git-branch` - Branche Git
- `git-commit` - Commit
- `git-merge` - Merge
- `git-pull-request` - Pull Request
- `git-compare` - Comparaison
- `source-control` - Contrôle de source

### Fichiers et dossiers

- `file` - Fichier
- `file-text` - Fichier texte
- `folder` - Dossier fermé
- `folder-opened` - Dossier ouvert
- `file-directory` - Répertoire

### Actions

- `refresh` - Rafraîchir
- `sync` - Synchroniser
- `check` - Cocher
- `close` - Fermer
- `plus` - Ajouter
- `minus` - Retirer
- `edit` - Éditer
- `trash` - Supprimer

### Navigation

- `arrow-right` - Flèche droite
- `arrow-down` - Flèche bas
- `chevron-right` - Chevron droit
- `chevron-down` - Chevron bas
- `go-to-file` - Aller au fichier

### État

- `check-circle` - Cercle avec coche
- `error` - Erreur
- `warning` - Avertissement
- `info` - Information
- `circle-filled` - Cercle rempli
- `circle-outline` - Cercle vide

### Autres

- `settings` - Paramètres
- `search` - Recherche
- `filter` - Filtrer
- `star` - Étoile
- `heart` - Cœur
- `tag` - Étiquette

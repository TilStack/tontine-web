# environments/

Ce dossier contient les **configurations selon l'environnement** : une pour le développement local, une pour la production.

## Pourquoi deux fichiers ?

Pendant le développement, on veut pouvoir tester des choses sans risquer de toucher à la vraie base de données. En production, on utilise la vraie configuration Firebase avec les vrais utilisateurs.

## Fichiers

### `environment.ts` — Développement
Utilisé automatiquement quand tu lances `ng serve` (serveur de développement).

### `environment.prod.ts` — Production
Utilisé automatiquement quand tu lances `ng build` (build de production). Angular remplace le fichier de dev par celui-ci grâce à la configuration dans `angular.json` (`fileReplacements`).

## Structure

```typescript
export const environment = {
  production: false,          // true en prod → active optimisations Angular
  apiUrl: 'https://...',     // URL de l'API tontine-api (Render)
  firebase: {
    apiKey: '...',            // Clé publique Firebase (ce n'est pas un secret)
    authDomain: '...',        // Domaine pour Firebase Auth
    projectId: '...',         // Identifiant du projet Firebase
    storageBucket: '...',     // Firebase Storage (photos, fichiers)
    messagingSenderId: '...', // Pour Firebase Cloud Messaging (notifications push)
    appId: '...',             // Identifiant de l'app dans Firebase
  },
};
```

## Comment l'utiliser dans un service ?

```typescript
import { environment } from '../../../environments/environment';

// Dans un service :
const url = `${environment.apiUrl}/saison/create`;
```

> **Note :** La configuration Firebase dans ce fichier n'est **pas secrète**. Firebase sécurise l'accès aux données via les Firestore Security Rules et Firebase Auth — pas par la dissimulation des clés.

## `environment.example.ts`

Modèle vide à copier si tu veux configurer un nouveau projet. Ne contient pas de vraies valeurs.

# features/

Ce dossier contient toutes les **fonctionnalités métier** de l'application, organisées par domaine. Chaque sous-dossier est une feature autonome avec ses propres composants, routes, et éventuellement son propre service.

## Organisation

```
features/
├── auth/          → Connexion, reset mot de passe, acceptation d'invitation
├── dashboard/     → Page principale adaptée au rôle de l'utilisateur
├── cycles/        → Création de saison, gestion du cycle actif, historique
├── caisse/        → Caisse commune, enregistrement des dépenses
├── membres/       → Invitation de nouveaux membres
├── super-admin/   → Interface d'administration globale (tous les départements)
└── onboarding/    → Demande de création d'un nouveau département
```

## Architecture générale

L'application suit une architecture en couches :

```
┌─────────────────────────────────────────────────────┐
│                   features/                          │
│  Composants Angular — ce que l'utilisateur voit     │
│  Template HTML + logique d'affichage seulement      │
└──────────────────────┬──────────────────────────────┘
                       │ injectent
┌──────────────────────▼──────────────────────────────┐
│                  core/services/                      │
│  Services Angular — récupération des données        │
│  Firestore (temps réel) + API REST (actions)        │
└──────────────────────┬──────────────────────────────┘
                       │ communiquent avec
┌──────────────────────▼──────────────────────────────┐
│   Firebase Firestore        tontine-api (Render)    │
│   (lecture temps réel)      (mutations / actions)   │
└─────────────────────────────────────────────────────┘
```

## Règle de design : qui fait quoi ?

- **Les composants** : affichent les données, réagissent aux actions utilisateur, délèguent tout aux services
- **Les services core** : parlent à Firebase et à l'API, gèrent les états asynchrones
- **Les guards** : décident si la navigation est autorisée

Un composant ne devrait **jamais** importer `HttpClient`, `Firestore`, ou `admin` directement (sauf `AcceptInvitationComponent` qui est un cas particulier d'onboarding).

## Navigation selon le rôle

```
/auth/*          → Accessible à tous (connexion, invitation)
/onboarding/*    → Utilisateur connecté sans département
/app             → Dashboard (rôle auto-détecté)
/app/cycles/*    → Admin + Bureau
/app/caisse      → Admin + Bureau
/super-admin/*   → Super Admin uniquement
```

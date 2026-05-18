# features/dashboard/

Le dashboard est la **page principale de l'application**, affichée après connexion. Il s'adapte dynamiquement selon le rôle de l'utilisateur.

## Architecture "smart/dumb" components

```
home.component.ts (Smart — "parent intelligent")
    │
    │  Récupère toutes les données (Firestore, claims)
    │  et les distribue aux composants enfants
    │
    ├── admin-dashboard.component.ts    (Dumb — reçoit les données, affiche)
    ├── bureau-dashboard.component.ts   (Dumb — idem)
    └── membre-dashboard.component.ts  (Dumb — idem)
```

### `home/home.component.ts` — Le coordinateur

Ce composant chargé en premier :
1. Lit les claims Firebase pour obtenir `deptId`, `uid`, et le rôle
2. Lance plusieurs écoutes Firestore en parallèle (`combineLatest`) :
   - Saison active
   - Cycle actif + cotisations
   - Historique des cycles
   - Liste des membres
   - Mon profil
   - Caisse
   - Transactions
3. Selon le rôle, affiche `admin-dashboard`, `bureau-dashboard`, ou `membre-dashboard`

### `admin/admin-dashboard.component.ts`

Tableau de bord complet pour l'administrateur du département.

**Fonctionnalités :**
- Vue d'ensemble (solde caisse, cycle actuel, liste des cotisations)
- Marquer une cotisation comme payée
- Forcer la fermeture d'un cycle
- Ouvrir le cycle suivant (après fermeture)
- Changer le rôle d'un membre
- Créer une saison (si aucune n'est active)

### `bureau/bureau-dashboard.component.ts`

Vue similaire à l'admin mais sans les actions de gestion :
- Voir l'état des cotisations
- Marquer une cotisation payée (action possible pour le bureau aussi)

### `membre/membre-dashboard.component.ts`

Vue simplifiée pour un membre ordinaire :
- Son rang dans la liste (quand sera-t-il bénéficiaire ?)
- L'état de sa propre cotisation
- Bouton de confirmation si c'est son tour de bénéficier

## Composants partagés (`shared/`)

Ces composants sont des **blocs visuels réutilisables** utilisés par les différents dashboards.

| Composant | Description |
|---|---|
| `beneficiaire-card` | Affiche le nom du bénéficiaire actuel et le montant à recevoir |
| `caisse-summary-card` | Solde de la caisse, total entrées/sorties |
| `cotisations-list-card` | Liste de tous les membres avec leur statut de paiement |
| `cotisation-status-card` | Statut personnel de paiement du membre connecté |
| `history-card` | Historique des cycles fermés avec bénéficiaires et montants |
| `mon-rang-card` | Position du membre dans la liste d'attente |
| `progression-card` | Barre de progression de la saison (X cycles / Y total) |

## Routes (`dashboard.routes.ts`)

```
/app           → HomeComponent (protégé par authGuard + deptGuard)
```

`HomeComponent` choisit dynamiquement quel sous-dashboard afficher via `@if (role === 'admin')`.

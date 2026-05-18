# features/cycles/

Ce dossier contient les pages dédiées à la **gestion avancée des cycles** : configuration d'une saison, vue détaillée d'un cycle actif, et historique complet.

## Composants

### `saison-setup/saison-setup.component.ts`

Page de création d'une nouvelle saison. Affichée quand aucune saison n'est active.

**Formulaire :**
- Montant de cotisation mensuelle (en FCFA)
- Mode : `lottery` (tirage au sort) ou `fixed` (ordre défini manuellement)
- Si `fixed` : interface drag-and-drop pour définir l'ordre des bénéficiaires

**À la soumission :**
Appelle `SaisonService.createSaison()` → `POST /saison/create`

### `cycle-active/cycle-active.component.ts`

Page détaillée du cycle en cours. Accessible aux admins et bureaux pour gérer les cotisations.

**Contient deux sous-composants :**

#### `cotisation-checklist/cotisation-checklist.component.ts`
Liste de tous les membres avec leur statut de paiement.
- Checkbox par membre : l'admin peut marquer comme payé → `POST /cycle/mark-cotisation-paid`
- Affiche le total payé vs total attendu
- Bouton "Fermer le cycle" → `POST /cycle/force-close`

#### `beneficiary-confirm/beneficiary-confirm.component.ts`
Affiché uniquement au bénéficiaire du cycle.
- Message indiquant qu'il est le bénéficiaire
- Montant qu'il devrait recevoir
- Bouton "Confirmer la réception" → `POST /cycle/confirm-reception`

### `cycle-history/cycle-history.component.ts`

Historique de tous les cycles fermés de la saison en cours.

- Liste ordonnée par numéro de cycle
- Pour chaque cycle : bénéficiaire, montant versé, montant caisse, date de fermeture, qui a fermé (`admin` / `cron` / `auto`)
- Indicateur de pénalisés (si des membres ont été pénalisés ce cycle)

## Flux de vie d'un cycle

```
Saison créée
     │
     ▼
Cycle 1 ouvert (status: "open")
     │
     │  Les membres paient leurs cotisations
     │  Admin coche les paiements un par un
     │
     ├── Admin force la fermeture → POST /cycle/force-close
     │           OU
     └── Deadline passée → cron ferme automatiquement
              │
              ▼
        Cycle 1 fermé (status: "closed")
        Cagnotte calculée, pénalités appliquées
              │
              ▼
        Admin ouvre le cycle 2 → POST /saison/open-next-cycle
              │
              ▼
        Cycle 2 ouvert...
              │
           (répéter)
              │
              ▼
        Dernier cycle fermé → Saison completed
```

## Routes (`cycles.routes.ts`)

```
/app/cycles/setup      → SaisonSetupComponent (admin uniquement)
/app/cycles/actif      → CycleActiveComponent (admin/bureau)
/app/cycles/historique → CycleHistoryComponent
```

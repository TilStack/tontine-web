# features/caisse/

Ce dossier gère la **caisse commune du département** : le fonds alimenté par les pénalités et utilisé pour les dépenses collectives.

## Comment fonctionne la caisse ?

La caisse est alimentée **automatiquement** lors de la fermeture d'un cycle :
- Si 5 membres sur 8 ont payé → 3 non-payeurs × montant cotisation = argent pénalité
- Cet argent va dans la caisse (pas dans la cagnotte du bénéficiaire)

La caisse peut ensuite être utilisée manuellement par l'admin/bureau pour des dépenses collectives (repas, événements, matériel, etc.)

## Composants

### `caisse/caisse.component.ts`

Page principale qui affiche :
- **Solde actuel** (grand nombre bien visible)
- **Total des entrées** (cumul de toutes les pénalités depuis le début)
- **Total des sorties** (cumul de toutes les dépenses)
- **Tableau des transactions** (100 dernières, ordre chronologique inversé)

Chaque transaction affiche :
- Date
- Libellé
- Catégorie (icône colorée)
- Montant (vert si entrée, rouge si sortie)
- Qui l'a créée

### `caisse/add-transaction-dialog/add-transaction-dialog.component.ts`

Dialog (pop-up) pour enregistrer une **dépense**. Ouvert depuis le bouton "Nouvelle dépense" de la page caisse.

**Formulaire :**
- Montant (en FCFA)
- Catégorie : `Nourriture`, `Sortie`, `Événement`, `Matériel`, `Autre`
- Libellé (description optionnelle)

À la soumission → `CaisseService.addTransaction()` → `POST /caisse/transaction`

> **Note :** On ne peut enregistrer que des **sorties** manuellement. Les entrées (pénalités) sont créées automatiquement par l'API lors de la fermeture des cycles.

## Structure Firestore

```
departments/{deptId}/
├── caisse               ← Document unique (solde, totaux)
└── transactions/        ← Collection (une par opération)
    ├── {txId1}          ← type: "credit", source: "cycle"  (entrée auto)
    └── {txId2}          ← type: "debit",  source: "manuel" (sortie manuelle)
```

## Routes (`caisse.routes.ts`)

```
/app/caisse → CaisseComponent (protégé par adminOrBureauGuard)
```

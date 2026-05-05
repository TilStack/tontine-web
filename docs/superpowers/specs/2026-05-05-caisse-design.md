# Module Caisse Commune — Design Spec

**Date :** 2026-05-05
**Scope :** Suivi du solde cumulé de la caisse commune, enregistrement des transactions de sortie (dépenses), historique complet — visible uniquement par admin et bureau.

---

## Contexte

La caisse commune accumule les montants non versés à chaque clôture de cycle (`montantCaisse = (memberCount - totalPaid) × montantCotisation`). Ces entrées automatiques sont déjà calculées et stockées sur chaque doc `cycle` par `_close-cycle.ts`. Ce module y ajoute la gestion des sorties (dépenses manuelles) et l'affichage centralisé du solde.

---

## Décisions de design

| Sujet | Décision |
|-------|----------|
| Solde stocké ou calculé | Stocké (`caisse.solde`) — mis à jour atomiquement par CF |
| Entrées cycles | Pas de doc `transactions` créé — `cycle.montantCaisse` est la source de vérité |
| Sorties manuelles | CF callable `addTransaction`, rôle `admin` ou `bureau` |
| Immuabilité | Transactions définitives — pas de modification ni suppression |
| Correction d'erreur | Transaction corrective (credit du même montant + libellé explicatif) |
| Visibilité | Admin + bureau uniquement (guard + Security Rules) |
| Toutes les écritures | Cloud Functions uniquement — pas d'écriture directe Angular |

---

## 1. Modèle de données Firestore

```
/departments/{deptId}/caisse               (document unique)
  solde:          number                   // solde courant
  totalEntrees:   number                   // cumul des montantCaisse (cycles)
  totalSorties:   number                   // cumul des débits manuels
  updatedAt:      Timestamp

/departments/{deptId}/transactions/{transactionId}
  montant:    number
  type:       "credit" | "debit"           // toujours "debit" pour les transactions manuelles
  categorie:  "nourriture" | "sortie" | "evenement" | "materiel" | "autre"
  libelle:    string                       // optionnel, texte libre
  source:     "cycle" | "manuel"          // toujours "manuel" pour les transactions manuelles
  cycleId:    string | null               // null pour les transactions manuelles
  createdBy:  string                      // uid admin ou bureau
  createdAt:  Timestamp
```

**Règles de structure :**
- Seules les transactions manuelles (débits) sont stockées dans `transactions/`
- Les entrées de cycles sont tracées via `caisse.totalEntrees` et `cycle.montantCaisse`
- La vue historique de la Caisse affiche uniquement les débits ; les entrées cycles restent dans le module Cycles (`cycle-history`)
- Le doc `caisse` est créé automatiquement par `merge: true` lors de la première clôture de cycle

---

## 2. Security Rules

```
match /departments/{deptId}/caisse {
  allow read: if inDept(deptId) && getUserRole(deptId) in ["admin", "bureau"];
  allow write: if false;  // Admin SDK uniquement
}

match /departments/{deptId}/transactions/{id} {
  allow read: if inDept(deptId) && getUserRole(deptId) in ["admin", "bureau"];
  allow write: if false;  // Admin SDK uniquement
}
```

---

## 3. Cloud Functions

### Modification : `_close-cycle.ts`

Dans la transaction Firestore existante (`db.runTransaction`), après le calcul de `montantCaisse`, ajouter avant le commit :

```typescript
const caisseRef = db.doc(`departments/${deptId}/caisse`);
txn.set(caisseRef, {
  solde:         FieldValue.increment(montantCaisse),
  totalEntrees:  FieldValue.increment(montantCaisse),
  totalSorties:  FieldValue.increment(0),  // garantit que le champ existe dès le premier doc
  updatedAt:     FieldValue.serverTimestamp(),
}, { merge: true });
```

Le `merge: true` gère correctement le cas où le doc `caisse` n'existe pas encore (premier cycle clôturé). `FieldValue.increment(0)` sur `totalSorties` garantit qu'il n'est jamais `undefined` côté client.

### Nouvelle : `add-transaction.ts` (callable)

**Auth :** `request.auth` requis, `role === "admin" || role === "bureau"` vérifié via custom claims.

**Payload d'entrée :**
```typescript
{
  deptId:    string;
  montant:   number;         // > 0
  categorie: CategorieType;  // enum validé
  libelle?:  string;         // optionnel
}
```

**Logique :**
1. Valide `montant > 0` → `invalid-argument` sinon
2. Valide `categorie` dans les valeurs autorisées → `invalid-argument` sinon
3. Dans `db.runTransaction` :
   a. Lit `caisse.solde`
   b. Vérifie `solde - montant >= 0` → `failed-precondition` ("Solde insuffisant") sinon
   c. Crée le doc transaction :
      ```
      { montant, type: "debit", categorie, libelle: libelle ?? "",
        source: "manuel", cycleId: null, createdBy: uid,
        createdAt: FieldValue.serverTimestamp() }
      ```
   d. Mise à jour atomique caisse :
      ```
      { solde: FieldValue.increment(-montant),
        totalSorties: FieldValue.increment(montant),
        updatedAt: FieldValue.serverTimestamp() }
      ```

---

## 4. Architecture Angular

### Structure des fichiers

```
src/app/features/caisse/
├── caisse.routes.ts
└── caisse/
    ├── caisse.component.ts
    ├── caisse.component.html
    ├── caisse.component.scss
    └── add-transaction-dialog/
        ├── add-transaction-dialog.component.ts
        └── add-transaction-dialog.component.html

src/app/core/models/
└── caisse.model.ts                          // CaisseDoc + TransactionDoc + CategorieType

src/app/core/services/
└── caisse.service.ts                        // watchCaisse(), watchTransactions(), addTransaction()

src/app/core/guards/
└── admin-or-bureau.guard.ts                 // nouveau — vérifie role === "admin" | "bureau"
```

### `caisse.model.ts`

```typescript
export type CategorieType = 'nourriture' | 'sortie' | 'evenement' | 'materiel' | 'autre';

export interface CaisseDoc {
  solde: number;
  totalEntrees: number;
  totalSorties: number;
  updatedAt: Timestamp;
}

export interface TransactionDoc {
  id: string;  // idField via collectionData
  montant: number;
  type: 'credit' | 'debit';
  categorie: CategorieType;
  libelle: string;
  source: 'cycle' | 'manuel';
  cycleId: string | null;
  createdBy: string;
  createdAt: Timestamp;
}
```

### `caisse.service.ts`

```typescript
watchCaisse(deptId: string): Observable<CaisseDoc | null>
  // docData() sur /departments/{deptId}/caisse

watchTransactions(deptId: string): Observable<TransactionDoc[]>
  // collectionData() sur /departments/{deptId}/transactions
  // orderBy('createdAt', 'desc'), limit(100), idField: 'id'

addTransaction(deptId: string, payload: AddTransactionPayload): Promise<void>
  // httpsCallable('addTransaction')({ deptId, ...payload })
```

### `admin-or-bureau.guard.ts`

Même pattern que `adminRoleGuard` existant — lit `role` depuis les custom claims Firebase Auth et redirige vers `/app` si `role` n'est pas `"admin"` ou `"bureau"`.

### Route

Dans `app.routes.ts`, sous le path `'app'` → children :

```typescript
{
  path: 'caisse',
  canActivate: [adminOrBureauGuard],
  loadChildren: () =>
    import('./features/caisse/caisse.routes').then((m) => m.CAISSE_ROUTES),
},
```

---

## 5. UI

### `caisse.component`

- **Card "Solde actuel"** en haut : montant formaté en FCFA (`toSignal(caisseService.watchCaisse(deptId))`)
- **Bouton "Ajouter une dépense"** (mat-raised-button) — ouvre `AddTransactionDialogComponent` via `MatDialog`
- **`mat-table`** des transactions, colonnes : Date | Catégorie | Libellé | Montant
  - Triée par `createdAt` DESC
  - Montant affiché en rouge avec signe `-`
  - **État vide :** "Aucune dépense enregistrée pour l'instant." si la collection est vide

### `add-transaction-dialog.component`

Formulaire réactif (ReactiveFormsModule) :

| Champ | Type | Validation |
|-------|------|-----------|
| `montant` | number | required, > 0 |
| `categorie` | mat-select | required |
| `libelle` | text | optionnel, max 200 chars |

- Validation client avant soumission (désactive le bouton si invalide)
- Si CF renvoie `failed-precondition` → affiche une erreur : "Solde insuffisant — le montant dépasse le solde disponible."
- `type`, `source`, `cycleId` envoyés par la CF (non saisis par l'utilisateur)

---

## 6. Tests

| Fichier | Tests clés |
|---------|-----------|
| `caisse.service.spec.ts` | watchCaisse, watchTransactions, addTransaction succès, addTransaction solde insuffisant |
| `caisse.component.spec.ts` | affiche le solde, état vide, ouvre le dialog |
| `add-transaction-dialog.component.spec.ts` | validation formulaire, soumission, erreur solde insuffisant |
| `add-transaction.spec.ts` (functions) | montant ≤ 0 rejeté, catégorie invalide rejetée, solde insuffisant rejeté, happy path |
| `_close-cycle.spec.ts` (functions) | test existant + mise à jour caisse (solde, totalEntrees) |
| `admin-or-bureau.guard.spec.ts` | admin → passe, bureau → passe, membre → redirigé |

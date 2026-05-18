# core/models/

Ce dossier contient les **interfaces TypeScript** qui décrivent la structure des données. Ce sont de simples définitions de types — elles ne contiennent pas de logique.

> **Analogie :** Si Firestore est un entrepôt de boîtes, les interfaces sont les étiquettes qui décrivent ce que contient chaque type de boîte.

---

## user.model.ts

### `UserRole`
```typescript
type UserRole = 'admin' | 'bureau' | 'membre';
```
Les trois rôles possibles au sein d'un département.

### `UserProfile`
Document Firestore stocké dans `departments/{deptId}/users/{uid}`.

| Champ | Type | Description |
|---|---|---|
| `uid` | string | Identifiant Firebase Auth |
| `displayName` | string | Nom affiché dans l'app |
| `email` | string | Email de connexion |
| `role` | UserRole | Rôle dans le département |
| `rang` | number | Position dans la liste (0 = premier) |
| `hasBenefited` | boolean | A déjà reçu la cagnotte ? |
| `joinedAt` | Timestamp | Date d'adhésion |
| `mustResetPassword` | boolean | Doit changer son mot de passe ? |

### `UserClaims`
Données stockées dans le **token Firebase** (custom claims). Présentes dans chaque requête authentifiée.

```typescript
interface UserClaims {
  deptId: string;          // département de l'utilisateur
  role?: 'super_admin';   // présent uniquement pour les super admins
}
```

---

## saison.model.ts

Document Firestore stocké dans `departments/{deptId}/saisons/{saisonId}`.

| Champ | Type | Description |
|---|---|---|
| `mode` | `'lottery' \| 'fixed'` | Tirage au sort ou ordre fixe |
| `montantCotisation` | number | Montant mensuel en FCFA |
| `memberOrder` | string[] | Tableau d'UIDs : l'ordre de bénéfice |
| `totalCycles` | number | Nombre total de cycles (= nombre de membres) |
| `currentCycleIndex` | number | Index du cycle actuel dans memberOrder |
| `status` | `'active' \| 'completed'` | État de la saison |

**Exemple :** si `memberOrder = ["A", "B", "C"]` et `currentCycleIndex = 1`, le bénéficiaire actuel est "B".

---

## cycle.model.ts

Document Firestore stocké dans `departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}`.

### `Cycle`

| Champ | Type | Description |
|---|---|---|
| `index` | number | Numéro du cycle (1, 2, 3...) |
| `beneficiaryUid` | string | UID du bénéficiaire de ce cycle |
| `deadline` | Timestamp | Date limite de cotisation |
| `status` | `'open' \| 'closed'` | État du cycle |
| `totalPaid` | number | Nombre de membres ayant payé |
| `montantVerse` | number | Montant versé au bénéficiaire |
| `montantCaisse` | number | Montant des pénalités allant en caisse |
| `closedBy` | string | `"admin"`, `"cron"`, ou `"auto"` |

### `Cotisation`
Document dans `cycles/{cycleId}/cotisations/{uid}` — un par membre.

| Champ | Type | Description |
|---|---|---|
| `paid` | boolean | A payé ce cycle ? |
| `paidAt` | Timestamp | Quand ? |
| `penalized` | boolean | A été pénalisé ? |

### `ActiveCycleData`
Type utilisé dans le frontend uniquement — regroupe le cycle et ses cotisations pour l'affichage.

---

## caisse.model.ts

### `CaisseDoc`
Document unique `departments/{deptId}/caisse` — le solde de la caisse.

| Champ | Description |
|---|---|
| `solde` | Solde actuel |
| `totalEntrees` | Cumul de toutes les entrées (pénalités) |
| `totalSorties` | Cumul de toutes les sorties (dépenses) |

### `TransactionDoc`
Document dans `departments/{deptId}/transactions/{id}`.

- `source: 'cycle'` → entrée automatique depuis une fermeture de cycle (pénalités)
- `source: 'manuel'` → sortie enregistrée manuellement par admin/bureau

---

## department.model.ts

Document `departments/{deptId}` — informations sur l'association.

---

## department-request.model.ts

Document `department_requests/{requestId}` — demande d'ouverture d'un département (en attente d'approbation super admin).

---

## invitation.model.ts

Document `departments/{deptId}/invitations/{token}` — invitation à rejoindre un département.

---

## notification.model.ts

Document `departments/{deptId}/users/{uid}/notifications/{notifId}` — notification in-app non lue.

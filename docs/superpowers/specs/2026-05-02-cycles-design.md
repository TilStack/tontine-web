# Module Cycle — Tontine Départementale
**Date :** 2026-05-02  
**Scope :** Gestion des saisons et cycles de tontine — ouverture, suivi des cotisations, clôture, confirmation bénéficiaire

---

## Contexte

Ce module s'appuie sur la Foundation (multi-tenant `deptId`, rôles Firestore, guards Angular). Il implémente la logique métier centrale de la tontine : la rotation mensuelle des bénéficiaires.

**Terminologie :**
- **Saison** = rotation complète où chaque membre bénéficie une fois (N membres = N cycles)
- **Cycle** = un tour mensuel — un bénéficiaire, une deadline, des cotisations

---

## Décisions de design

| Sujet | Décision |
|-------|----------|
| Clôture automatique | Cloud Function Firestore trigger (`onDocumentWritten`) |
| Clôture manuelle | Callable `forceCloseCycle` déclenchée par l'admin |
| Clôture cron | Cloud Scheduler 00h01 quotidien, filet de sécurité |
| Atomicité des clôtures | Transaction Firestore unique dans `_closeCycle` |
| Écriture cotisations | Cloud Function callable uniquement (pas d'écriture directe Angular) |
| Confirmation bénéficiaire | Cloud Function callable `confirmReception` |
| Validation ordre saison | Côté serveur uniquement (vérification `joinedAt` Firestore) |

---

## 1. Modèle de données Firestore

```
/departments/{deptId}/saisons/{saisonId}
  status:             "active" | "completed"
  mode:               "lottery" | "fixed"
  montantCotisation:  number            // ex. 15000 FCFA, défini par l'admin
  memberOrder:        string[]          // [uid1, uid2, ...] — immuable sauf pénalité
  totalCycles:        number            // = memberOrder.length initial
  currentCycleIndex:  number            // index 0-based du cycle en cours
  completedAt:        Timestamp | null  // quand tous les cycles sont terminés
  createdAt:          Timestamp
  createdBy:          string            // uid admin

/departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}
  index:              number            // 1-based — affichage "Cycle 3/8"
  beneficiaryUid:     string
  deadline:           Timestamp         // 5 du mois suivant à 23h59 UTC+1
  status:             "open" | "closed"
  closedAt:           Timestamp | null
  closedBy:           "auto" | "admin" | "cron"
  totalPaid:          number            // nb de membres ayant payé
  montantVerse:       number            // totalPaid × montantCotisation
  montantCaisse:      number            // manquants → caisse commune
  confirmedAt:        Timestamp | null  // bénéficiaire confirme réception
  confirmedBy:        string | null     // uid bénéficiaire (double vérification)
  createdAt:          Timestamp

/departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}/cotisations/{userId}
  paid:               boolean
  paidAt:             Timestamp | null
  recordedBy:         string | null     // uid admin/bureau ayant coché
  penalized:          boolean           // default false
  penaltyAppliedAt:   Timestamp | null  // traçabilité pénalité sur ce cycle
```

**Règles de structure :**
- `cycleId` auto-généré par Firestore — le champ `index` sert à l'affichage
- `cotisations` en sous-collection (pas map) pour isoler les Security Rules par document
- `montantCaisse` stocké à la clôture — le module Caisse s'y branche directement
- `closedBy: "auto" | "admin" | "cron"` — traçabilité pour audit et module Notifications
- Les rangs 1 et 2 de `memberOrder` sont toujours les 2 membres les plus anciens (validé côté serveur)

---

## 2. Architecture Angular

### Structure des fichiers

```
src/app/features/cycles/
├── cycles.routes.ts
├── saison-setup/
│   ├── saison-setup.component.ts
│   └── saison-setup.component.html
├── cycle-active/
│   ├── cycle-active.component.ts
│   ├── cycle-active.component.html
│   ├── cotisation-checklist/
│   │   ├── cotisation-checklist.component.ts    // @Input() — liste membres
│   │   └── cotisation-checklist.component.html
│   └── beneficiary-confirm/
│       ├── beneficiary-confirm.component.ts     // conditionnel bénéficiaire
│       └── beneficiary-confirm.component.html
└── cycle-history/
    ├── cycle-history.component.ts
    └── cycle-history.component.html

src/app/core/services/
├── saison.service.ts     // createSaison(), watchActiveSaison()
└── cycle.service.ts      // watchActiveCycle(), openNextCycle()

src/app/core/guards/
└── admin-role.guard.ts   // vérifie role === 'admin' via Firestore
```

### Routing

```typescript
// Sous /app — déjà protégé par authGuard + deptGuard + mustResetPasswordGuard
/app/cycles              → cycle-active    (tous les rôles, lecture)
/app/cycles/setup        → saison-setup    (canActivate: [adminRoleGuard])
/app/cycles/history      → cycle-history   (tous les rôles, lecture)
```

### Règles d'accès dans les composants

| Composant | Condition d'affichage |
|-----------|----------------------|
| Bouton "Marquer payé" | `role === 'admin' \| 'bureau'` |
| Bouton "Forcer la clôture" | `role === 'admin'` ET `deadline < now()` |
| Bouton "Ouvrir cycle suivant" | `role === 'admin'` ET cycle précédent `confirmedAt !== null` |
| `beneficiary-confirm` | `cycle.status === 'closed'` ET `uid === beneficiaryUid` ET `confirmedAt === null` |
| Route `/app/cycles/setup` | `adminRoleGuard` — lit rôle depuis Firestore (pas JWT) |

### État temps réel

- `CycleService.watchActiveCycle()` retourne un `Observable` combinant le document cycle et sa sous-collection cotisations
- `toSignal()` dans les composants (Angular 20 zoneless, pas de `zone.js`)
- `cotisation-checklist` reçoit ses données via `@Input()` depuis `cycle-active` — pas de lecture Firestore directe dans le composant enfant

### `adminRoleGuard`

```typescript
export const adminRoleGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const auth = inject(AuthService);
  const router = inject(Router);
  return firstValueFrom(
    auth.user$.pipe(
      take(1),
      switchMap(user => {
        if (!user) return of(router.createUrlTree(['/auth/login']));
        const claims = auth.getClaims();
        return from(claims).pipe(
          switchMap(c => {
            if (!c?.deptId) return of(router.createUrlTree(['/auth/no-department']));
            return userService.watchProfile(c.deptId, user.uid).pipe(
              take(1),
              map(profile => profile?.role === 'admin' ? true : router.createUrlTree(['/app']))
            );
          })
        );
      })
    )
  );
};
```

---

## 3. Cloud Functions

Six fonctions exportées + un helper interne :

```
functions/src/
├── create-saison.ts           // callable — admin
├── mark-cotisation-paid.ts    // callable — admin | bureau
├── force-close-cycle.ts       // callable — admin
├── open-next-cycle.ts         // callable — admin
├── confirm-reception.ts       // callable — membre (bénéficiaire uniquement)
├── close-cycle-cron.ts        // Cloud Scheduler 00h01 UTC+1
└── _close-cycle.ts            // helper interne — partagé par force-close et cron
```

### `createSaison`

Callable, `role === 'admin'` requis.

1. Lit tous les `users` du département, trie par `joinedAt` ascending
2. Vérifie que `memberOrder[0]` et `memberOrder[1]` correspondent aux 2 UIDs avec les `joinedAt` les plus anciens — erreur `failed-precondition` sinon
3. En mode `lottery` : génère un ordre aléatoire pour les membres restants (rangs 3+) et les concatène après les 2 anciens
4. En mode `fixed` : utilise `memberOrder` tel que fourni (après validation des rangs 1 et 2)
5. Dans un batch : crée le document saison + crée le cycle 1 (index: 1, beneficiaryUid = memberOrder[0], deadline = 5 du mois suivant 23h59 UTC+1)

### `markCotisationPaid`

Callable, `role === 'admin' | 'bureau'` requis.

1. Dans une transaction : écrit `cotisations/{userId}` avec `paid: true`, `paidAt: now()`, `recordedBy: callerUid`
2. Incrémente `cycle.totalPaid` atomiquement
3. Relit `memberCount` depuis `saison.totalCycles` (source de vérité immuable — `memberOrder.length` reste constant même après pénalité, mais `totalCycles` est explicitement immuable)
4. Si `totalPaid === memberCount` → appelle `_closeCycle(deptId, saisonId, cycleId, 'auto')`

### `_closeCycle(deptId, saisonId, cycleId, closedBy)` — helper interne

Tout dans une **transaction Firestore atomique unique** (rollback total si un write échoue) :

1. Re-lit `cycle.status` — si déjà `"closed"` : abort (protection anti-double exécution)
2. Calcule `montantVerse = totalPaid × saison.montantCotisation`
3. Calcule `montantCaisse = (memberCount - totalPaid) × saison.montantCotisation`
4. Marque toutes les cotisations `paid === false` → `penalized: true`, `penaltyAppliedAt: now()`
5. Déplace les UIDs pénalisés en fin de `saison.memberOrder` (préserve l'ordre relatif des non-pénalisés)
6. Met à jour `cycle` : `status: "closed"`, `closedAt: now()`, `closedBy`, `montantVerse`, `montantCaisse`
7. Si `cycle.index === saison.totalCycles` → `saison.status: "completed"`, `saison.completedAt: now()`

### `forceCloseCycle`

Callable, `role === 'admin'` requis.

- Vérifie que `cycle.status === 'open'`
- Appelle `_closeCycle(deptId, saisonId, cycleId, 'admin')`

### `openNextCycle`

Callable, `role === 'admin'` requis.

1. Vérifie `cycle.status === 'closed'`
2. Vérifie `cycle.confirmedAt !== null` — erreur `failed-precondition` sinon ("Le bénéficiaire n'a pas encore confirmé la réception")
3. Calcule `nextIndex = saison.currentCycleIndex + 1`
4. Crée le nouveau cycle : `index: nextIndex + 1`, `beneficiaryUid: saison.memberOrder[nextIndex]`, `deadline = 5 du mois suivant`
5. Met à jour `saison.currentCycleIndex`

### `confirmReception`

Callable, `role === 'membre'` vérifié, `uid === cycle.beneficiaryUid` requis.

1. Vérifie `cycle.status === 'closed'`
2. Vérifie `request.auth.uid === cycle.beneficiaryUid` — erreur `permission-denied` sinon
3. Vérifie `cycle.confirmedAt === null` — erreur `already-exists` sinon
4. Écrit `cycle.confirmedAt: now()`, `cycle.confirmedBy: callerUid`

### `closeCycleCron`

Cloud Scheduler, `every 24 hours` à 00h01 UTC+1.

1. Requête Firestore : tous les cycles `status === 'open'` dont `deadline < now()`, pour tous les départements
2. Pour chacun : appelle `_closeCycle(..., 'cron')` — la protection anti-double exécution dans `_closeCycle` (re-lecture status) empêche les conflits avec `forceCloseCycle`

---

## 4. Security Rules (ajouts au fichier existant)

```javascript
// Saisons — lecture membres du département, écriture Cloud Functions uniquement
match /departments/{deptId}/saisons/{saisonId} {
  allow read:  if inDept(deptId);
  allow write: if false; // Cloud Functions Admin SDK uniquement
}

// Cycles — lecture membres, écriture Cloud Functions uniquement
match /departments/{deptId}/saisons/{saisonId}/cycles/{cycleId} {
  allow read:  if inDept(deptId);
  allow write: if false;
}

// Cotisations — lecture membres, écriture Cloud Functions uniquement
match /departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}/cotisations/{userId} {
  allow read:  if inDept(deptId);
  allow write: if false;
}
```

Toutes les écritures passent par l'Admin SDK (Cloud Functions) — aucune écriture directe autorisée depuis Angular.

---

## 5. Flux complets

### Flux 1 — Ouverture d'une saison
Admin → `/app/cycles/setup` → choisit mode + montant + ordre → `createSaison()` CF → saison créée + cycle 1 ouvert → Angular redirige vers `/app/cycles`

### Flux 2 — Cotisation enregistrée
Admin/bureau → `cycle-active` → coche un membre → `markCotisationPaid()` CF → transaction : cotisation écrite + totalPaid incrémenté → si dernier paiement → `_closeCycle('auto')` → `cycle.status: "closed"` → Angular met à jour l'UI en temps réel via listener Firestore

### Flux 3 — Clôture manuelle
Admin → bouton "Forcer la clôture" (visible si `deadline < now()`) → `forceCloseCycle()` CF → `_closeCycle('admin')` → pénalités appliquées, montants calculés, cycle fermé

### Flux 4 — Confirmation bénéficiaire
Bénéficiaire → voit `beneficiary-confirm` (cycle closed + uid match + confirmedAt null) → clique "Confirmer réception" → `confirmReception()` CF → `confirmedAt` écrit → admin peut maintenant ouvrir cycle suivant

### Flux 5 — Ouverture cycle suivant
Admin → bouton "Ouvrir cycle suivant" → `openNextCycle()` CF → vérifie `confirmedAt !== null` → crée cycle N+1 → Angular met à jour via listener

### Flux 6 — Clôture automatique par cron
Cloud Scheduler 00h01 → `closeCycleCron` → liste tous cycles `open` avec `deadline < now()` → `_closeCycle('cron')` pour chacun → re-lecture status dans transaction (protection doublon)

---

## 6. Ce qui n'est PAS dans ce spec

- Notifications (rappels J-5, confirmation paiement, alerte retard) → module Notifications
- Gestion fine des pénalités financières → module Pénalités
- Caisse commune (suivi du `montantCaisse` accumulé) → module Caisse
- Invitations et gestion des membres → Foundation (déjà implémenté)

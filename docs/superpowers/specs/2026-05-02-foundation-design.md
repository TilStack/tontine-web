# Foundation — Tontine Départementale
**Date :** 2026-05-02  
**Scope :** Auth Firebase, structure multi-tenant Firestore, routing + guards Angular, App Shell

---

## Contexte

Projet Angular 20.1 (CLI 20.3) + Firebase entièrement vierge. Ce spec couvre le socle sur lequel tous les autres modules (cycles, cotisations, pénalités) seront construits. Les autres sous-systèmes ne peuvent pas être développés sans cette fondation.

---

## Décisions de design

| Sujet | Décision |
|-------|----------|
| Authentification | Email + mot de passe uniquement (Firebase Auth) |
| Rejoindre un département | Invitation par lien email **ou** admin crée le compte |
| Créer un département | Super Admin directement **ou** demande soumise + validation |
| Navigation | Sidebar fixe (réduite en icônes sur mobile) |
| Multi-tenancy | Custom Claims (deptId) + rôle Firestore (approche hybride) |

---

## 1. Architecture Angular

```
src/app/
├── core/
│   ├── models/          # User, Department, Invitation, DepartmentRequest
│   ├── services/        # AuthService, UserService, DepartmentService
│   └── guards/          # authGuard, deptGuard, mustResetPasswordGuard, superAdminGuard
├── shared/
│   └── components/
│       └── app-shell/   # AppShellComponent — sidebar + <router-outlet>
├── features/
│   ├── auth/            # login, accept-invitation, reset-password, no-department
│   ├── onboarding/      # demande de création de département (public)
│   ├── super-admin/     # gestion des départements et demandes
│   └── dashboard/       # page d'accueil (stub pour features futures)
└── app.routes.ts
```

**Règles :**
- Chaque feature est lazy-loaded via `loadChildren`
- Aucune logique métier dans les composants — tout passe par les services
- TypeScript strict, aucun `any`

---

## 2. Structure Firestore

```
/departments/{deptId}
  name: string
  adminId: string
  status: "active" | "pending"
  createdAt: Timestamp
  settings: {}

/departments/{deptId}/users/{userId}
  displayName: string
  email: string
  role: "admin" | "bureau" | "membre"
  rang: number
  hasBenefited: boolean
  joinedAt: Timestamp
  mustResetPassword: boolean     # true pour les comptes créés par l'admin (flux 2B)

/departments/{deptId}/invitations/{token}
  email: string
  role: "admin" | "bureau" | "membre"
  createdBy: string           # uid de l'admin
  expiresAt: Timestamp
  used: boolean

/department_requests/{requestId}          # racine — pas sous /departments
  requesterEmail: string
  requesterName: string
  deptName: string
  message: string
  status: "pending" | "approved" | "rejected"
  createdAt: Timestamp

/users/{userId}                           # profil global, lecture propre uniquement
  displayName: string
  email: string
  deptId: string
  createdAt: Timestamp
```

**Pourquoi `department_requests` à la racine :** les demandeurs n'ont pas encore de `deptId` dans leur token, donc ils ne peuvent pas écrire sous `/departments/`.

---

## 3. Approche Multi-tenant : Custom Claims + Firestore

**Custom Claim (JWT) :** `deptId` — défini à la création du compte, immuable, vérifié par les Security Rules sans lecture Firestore supplémentaire.

**Rôle dans Firestore :** `/departments/{deptId}/users/{uid}.role` — modifiable par l'admin immédiatement, sans forcer un refresh de token.

**Security Rules (principes) :**

```javascript
function inDept(deptId) {
  return request.auth != null && request.auth.token.deptId == deptId;
}

function isSuperAdmin() {
  return request.auth != null && request.auth.token.role == "super_admin";
}

function getUserRole(deptId) {
  return get(/databases/$(database)/documents/
    departments/$(deptId)/users/$(request.auth.uid)).data.role;
}

// Membres : lecture dans son département uniquement
match /departments/{deptId}/users/{userId} {
  allow read:  if inDept(deptId) || isSuperAdmin();
  allow write: if (inDept(deptId) && getUserRole(deptId) == "admin")
               || isSuperAdmin();
}

// Invitations : créées par admin uniquement, lues par utilisateur connecté
// La validation métier du token (expiration, already used) est faite côté Cloud Function
match /departments/{deptId}/invitations/{token} {
  allow read:  if request.auth != null
               && request.time < resource.data.expiresAt;
  allow write: if inDept(deptId) && getUserRole(deptId) == "admin";
}

// Demandes de département : écriture publique, lecture super_admin
match /department_requests/{requestId} {
  allow create: if true;
  allow read, update: if isSuperAdmin();
}
```

---

## 4. Routing & Guards

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes')
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./features/onboarding/onboarding.routes')
  },
  {
    path: 'admin',
    canActivate: [superAdminGuard],
    loadChildren: () => import('./features/super-admin/super-admin.routes')
  },
  {
    path: 'app',
    canActivate: [authGuard, deptGuard, mustResetPasswordGuard],
    component: AppShellComponent,
    loadChildren: () => import('./features/dashboard/dashboard.routes')
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' }
];
```

**Guards :**

| Guard | Condition | Redirection si échec |
|-------|-----------|----------------------|
| `authGuard` | `auth.currentUser != null` | `/auth/login` |
| `deptGuard` | `token.deptId` présent | `/auth/no-department` |
| `mustResetPasswordGuard` | `user.mustResetPassword === false` | `/auth/reset-password` |
| `superAdminGuard` | `token.role === 'super_admin'` | `/app` |

---

## 5. Flux d'authentification

### Flux 1 — Connexion standard
`/auth/login` → Firebase Auth (email+mdp) → lire custom claim → `/app/dashboard`  
Si `deptId` absent du token → `/auth/no-department` (page d'attente)

### Flux 2A — Invitation par lien
Email avec lien unique → `/auth/accept-invitation?token=xxx` → valider token Firestore → formulaire (nom + mdp) → Cloud Function `setUserClaim(uid, deptId)` → `/app/dashboard`

### Flux 2B — Admin crée le compte
Admin saisit email + nom → Cloud Function `createManagedUser` (crée compte + mdp temporaire + claim) → email envoyé au membre (identifiants + lien reset mdp) → membre se connecte → reset mdp obligatoire → `/app/dashboard`

### Flux 3 — Demande de création de département
`/onboarding/request` → formulaire (nom dept + contact) → écrit dans `/department_requests` → Super Admin valide dans `/admin/requests` → Cloud Function `provisionDepartment` (crée dept + admin + claim) → email de confirmation

---

## 6. App Shell — Sidebar

**`AppShellComponent`** charge le rôle de l'utilisateur depuis Firestore au démarrage et adapte les liens visibles :

| Lien | membre | bureau | admin |
|------|--------|--------|-------|
| Tableau de bord | ✅ | ✅ | ✅ |
| Cotisations | ✅ | ✅ | ✅ |
| Membres | ✅ | ✅ | ✅ |
| Caisse | — | ✅ | ✅ |
| Gérer les cycles | — | — | ✅ |
| Inviter membres | — | — | ✅ |
| Paramètres | — | — | ✅ |

La sidebar affiche : nom du département, statut du cycle en cours (`● Cycle actif` / `○ Aucun cycle`), avatar + nom + rôle de l'utilisateur en bas.

**Règle d'invitation :** seul le rôle `admin` peut créer des invitations et assigner les rôles `bureau` et `membre`. Le rôle `bureau` n'a pas accès à la fonctionnalité d'invitation — ce droit est volontairement restreint à l'admin pour éviter toute escalade de privilèges non contrôlée.

---

## 7. Cloud Functions nécessaires (Foundation)

| Fonction | Déclencheur | Rôle |
|----------|-------------|------|
| `setUserClaim` | Callable (HTTPS) | Défini `deptId` dans le JWT — appelée après acceptation d'invitation |
| `createManagedUser` | Callable (admin uniquement) | Crée un compte Firebase Auth + claim + doc Firestore |
| `provisionDepartment` | Callable (super_admin uniquement) | Crée le département + son admin dans Firestore + claim |

Ces fonctions tournent toutes côté serveur (Admin SDK). Aucune logique de provisioning côté Angular.

**Compte Super Admin :** créé manuellement via Firebase Console (ou script d'initialisation one-shot). Le custom claim `{ role: "super_admin" }` lui est assigné via Admin SDK. Il n'existe pas de flux d'inscription pour ce rôle dans l'application.

---

## Ce qui n'est PAS dans ce spec

- Gestion des cycles (ouverture, fermeture, ordre des rangs) → spec suivant
- Cotisations et paiements → spec suivant
- Pénalités → spec suivant
- Notifications (rappels J-5) → spec suivant
- Caisse commune → spec suivant

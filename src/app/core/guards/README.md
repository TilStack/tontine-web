# core/guards/

Les **route guards** sont des fonctions qui s'exécutent avant qu'Angular navigue vers une page. Si la condition n'est pas remplie, la navigation est bloquée et l'utilisateur est redirigé.

```
Utilisateur clique sur un lien
          │
          ▼
    [Guard vérifie]
          │
     ┌────┴────┐
   ✓ OK     ✗ Refus
     │         │
     ▼         ▼
  La page   Redirection
  s'affiche  (login, no-dept...)
```

## Déclaration dans les routes

```typescript
// Exemple dans app.routes.ts
{
  path: 'app',
  canActivate: [authGuard, deptGuard],  // Les deux doivent passer
  component: DashboardComponent
}
```

---

## auth.guard.ts — `authGuard`

**Question :** L'utilisateur est-il connecté ?

- Si **oui** → navigation autorisée
- Si **non** → redirection vers `/auth/login`

Utilise `AuthService.user$` (Observable Firebase) pour détecter la connexion.

---

## dept.guard.ts — `deptGuard`

**Question :** L'utilisateur a-t-il un département associé dans ses claims Firebase ?

- Si **oui** (`claims.deptId` existe) → navigation autorisée
- Si **non** → redirection vers `/auth/no-department`

Cas d'usage : un utilisateur peut être connecté mais ne pas encore être rattaché à un département (invitation en attente, compte créé mais pas encore provisonné).

---

## admin-role.guard.ts — `adminRoleGuard`

**Question :** L'utilisateur est-il `admin` dans son département ?

- Lit le rôle depuis Firestore `departments/{deptId}/users/{uid}.role`
- Si `admin` → autorisé
- Sinon → redirection vers `/app` (dashboard)

Protège les pages réservées aux admins (création de saison, gestion des membres, etc.)

---

## admin-or-bureau.guard.ts — `adminOrBureauGuard`

**Question :** L'utilisateur est-il `admin` OU `bureau` ?

Même logique que `adminRoleGuard` mais accepte aussi les membres du bureau. Protège les pages de gestion des cotisations.

---

## super-admin.guard.ts — `superAdminGuard`

**Question :** L'utilisateur est-il `super_admin` ?

Lit le custom claim `role` depuis le token Firebase (pas Firestore). Le super_admin n'est rattaché à aucun département.

---

## must-reset-password.guard.ts — `mustResetPasswordGuard`

**Question :** L'utilisateur doit-il changer son mot de passe ?

Quand un admin crée un membre géré (`POST /member/create`), le compte est créé avec `mustResetPassword: true`. Ce guard redirige vers la page de reset tant que cette valeur est `true`.

---

## Chaîne de guards typique

Pour accéder au dashboard admin, l'utilisateur passe par :

```
authGuard → deptGuard → adminRoleGuard → mustResetPasswordGuard
```

Chaque guard est une couche de sécurité supplémentaire.

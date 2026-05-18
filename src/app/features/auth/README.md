# features/auth/

Ce dossier gère tout ce qui concerne **l'accès à l'application** : connexion, réinitialisation du mot de passe, et acceptation d'une invitation.

## Composants

### `login/` — Page de connexion

Formulaire email + mot de passe. Appelle `AuthService.login()`.

Après connexion réussie, Angular vérifie les claims Firebase :
- Si `deptId` existe → redirection vers `/app` (dashboard)
- Sinon → redirection vers `/auth/no-department`

### `reset-password/` — Réinitialisation du mot de passe

Deux cas d'usage :
1. Utilisateur qui a oublié son mot de passe → formulaire email, envoie un lien de reset
2. Membre créé par un admin avec `mustResetPassword: true` → forcé de passer par cette page

### `no-department/` — Aucun département associé

Page affichée quand l'utilisateur est connecté mais n'a pas encore de `deptId` dans ses claims. Propose de faire une demande de création de département ou d'attendre une invitation.

### `accept-invitation/` — Accepter une invitation

Flux complet en deux étapes :

```
1. ngOnInit : POST /invitation/validate
       │
       │  Récupère l'email et le nom du département
       │  depuis les paramètres d'URL (?dept=xxx&token=yyy)
       ▼
2. submit() : createUserWithEmailAndPassword (Firebase)
       │         + POST /invitation/accept (avec le token fresh)
       │         + user.getIdToken(true) (force le refresh des claims)
       ▼
   Redirection vers /app
```

**Pourquoi `getIdToken(true)` à la fin ?**
Quand l'API appelle `admin.auth().setCustomUserClaims(uid, { deptId })`, le token existant ne contient pas encore le `deptId`. Forcer le refresh (`true`) récupère un nouveau token qui contient le claim fraîchement assigné.

### `auth-layout/` — Mise en page partagée

Composant de layout utilisé par toutes les pages d'auth (cadre, logo, fond). Les pages s'insèrent dedans via `<router-outlet>`.

## Routes (`auth.routes.ts`)

```
/auth/login              → LoginComponent
/auth/reset-password     → ResetPasswordComponent
/auth/no-department      → NoDepartmentComponent
/auth/accept-invitation  → AcceptInvitationComponent
```

Aucune de ces routes n'est protégée par `authGuard` — elles doivent être accessibles sans être connecté.

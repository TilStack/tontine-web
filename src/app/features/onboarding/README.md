# features/onboarding/

Ce dossier gère la **première visite d'un utilisateur** qui n'appartient encore à aucun département.

## Contexte

Quand un utilisateur se connecte sans `deptId` dans ses claims Firebase, le `deptGuard` le redirige vers `/auth/no-department`. De là, il peut soit attendre une invitation d'un admin existant, soit **demander la création d'un nouveau département**.

## Composant

### `request-department/request-department.component.ts`

Formulaire de demande de création d'un département.

**Champs :**
- Nom de l'association
- Description
- Nombre de membres prévu
- Email de contact (pré-rempli avec l'email connecté)

**À la soumission :**
Crée un document dans `department_requests/` avec `status: "pending"`.

Cette demande apparaîtra ensuite dans l'interface super admin (`features/super-admin/requests/`) pour être approuvée ou rejetée.

## Flux complet d'onboarding

```
Nouvel utilisateur
     │
     ├── Option A : Reçoit un lien d'invitation
     │        │
     │        └── /auth/accept-invitation?dept=xxx&token=yyy
     │                    │
     │                    └── Crée son compte + rejoint le département
     │
     └── Option B : Veut créer un nouveau département
              │
              └── /onboarding/demande-departement
                          │
                          └── Soumet le formulaire
                                    │
                                    └── Super Admin approuve
                                                │
                                                └── Département créé,
                                                    admin notifié
```

## Routes (`onboarding.routes.ts`)

```
/onboarding/demande-departement → RequestDepartmentComponent
```

Accessible à tout utilisateur connecté (même sans deptId), car c'est justement l'étape pour en obtenir un.

# features/super-admin/

Ce dossier contient l'interface du **Super Administrateur** — le compte qui gère tous les départements de l'application. Il n'appartient à aucun département spécifique.

## Accès

Protégé par `superAdminGuard`. Seul un compte avec le custom claim Firebase `role: "super_admin"` peut accéder à ces pages.

## Composants

### `dashboard/super-admin-dashboard.component.ts`

Page d'accueil du super admin. Affiche :
- Nombre total de départements actifs
- Nombre de demandes en attente
- Liens vers `dept-list` et `requests`

### `dept-list/dept-list.component.ts`

Liste de tous les départements existants. Pour chaque département :
- Nom, statut, date de création
- Lien vers la page de détail `dept-detail`

### `dept-detail/dept-detail.component.ts`

Vue détaillée d'un département :
- Informations générales
- Saison active (si existe) et cycle en cours
- Liste des membres avec leur rôle
- Actions disponibles :
  - "Exclure un membre" → `SuperAdminService.excludeMember()` → `POST /member/exclude`
  - "Forcer la clôture de saison" → `SuperAdminService.forceCloseSaison()` → `POST /admin/force-saison-close`

### `requests/dept-requests.component.ts`

Liste des demandes de création de département en statut `pending`.

Pour chaque demande :
- Nom de l'association, email du demandeur, date de demande
- Bouton **Approuver** → `SuperAdminService.approveRequest()` → `POST /department/provision`
- Bouton **Rejeter** (avec raison) → `SuperAdminService.rejectRequest()` → `POST /department/reject`

**Que se passe-t-il lors de l'approbation ?**
L'API crée automatiquement :
1. Le document `departments/{deptId}` dans Firestore
2. Le compte Firebase Auth pour l'admin du département
3. Le profil Firestore de l'admin
4. Les custom claims `deptId` sur son compte

### `confirm-dialog/confirm-dialog.component.ts`

Dialog de confirmation générique réutilisé pour les actions dangereuses (exclusion, clôture forcée). Affiche un message d'avertissement et demande une raison.

## Service (`super-admin.service.ts`)

Toutes les données Firestore sont lues en temps réel (Observables). Les actions passent par `ApiService` → `tontine-api`.

| Méthode | Destination |
|---|---|
| `watchDepartments()` | Firestore `departments/` |
| `watchPendingRequests()` | Firestore `department_requests/` où `status == pending` |
| `watchDeptDetail(deptId)` | Combine dept + saison + membres + cycle en cours |
| `approveRequest(requestId)` | `POST /department/provision` |
| `rejectRequest(requestId, reason)` | `POST /department/reject` |
| `forceCloseSaison(deptId, saisonId, reason)` | `POST /admin/force-saison-close` |
| `excludeMember(deptId, userId, reason)` | `POST /member/exclude` |

## Routes (`super-admin.routes.ts`)

```
/super-admin                    → SuperAdminDashboardComponent
/super-admin/departements       → DeptListComponent
/super-admin/departements/:id   → DeptDetailComponent
/super-admin/demandes           → DeptRequestsComponent
```

# Super Admin Module — Design Spec

**Date:** 2026-05-17
**Status:** Approved

---

## 1. Overview

Rebuild the existing prototype Super Admin module into a production-quality feature. The module gives the super admin a global view of all departments, validates creation requests, and allows two exceptional interventions (force-close saison, exclude member) — all logged in `/admin_logs`.

The existing `SuperAdminDashboardComponent` and `DeptRequestsComponent` are prototypes (inline templates, `getDocs` one-shot, no BEM, no real-time) and are fully replaced. No logic is reused.

---

## 2. Routes

```
/admin                         → redirect to /admin/departments
/admin/departments             → DeptListComponent (list + stats)
/admin/departments/:deptId     → DeptDetailComponent (read-only + interventions)
/admin/requests                → DeptRequestsComponent (validate/reject requests)
```

All routes live under the existing `superAdminGuard`. The shell (`SuperAdminDashboardComponent`) provides the sidenav layout and `<router-outlet>`.

**`super-admin.routes.ts` final shape:**
```typescript
export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/super-admin-dashboard.component')
      .then(m => m.SuperAdminDashboardComponent),
    children: [
      { path: '', redirectTo: 'departments', pathMatch: 'full' },
      {
        path: 'departments',
        loadComponent: () => import('./dept-list/dept-list.component')
          .then(m => m.DeptListComponent),
      },
      {
        path: 'departments/:deptId',
        loadComponent: () => import('./dept-detail/dept-detail.component')
          .then(m => m.DeptDetailComponent),
      },
      {
        path: 'requests',
        loadComponent: () => import('./requests/dept-requests.component')
          .then(m => m.DeptRequestsComponent),
      },
    ],
  },
];
```

---

## 3. Data Model

### 3.1 Existing models (unchanged)

- `Department { id, name, adminId, status: 'active'|'pending', createdAt, settings }`
- `DepartmentRequest { id, requesterEmail, requesterName, deptName, message, status: 'pending'|'approved'|'rejected', createdAt }`
- `Saison { id, status: 'active'|'completed', mode, montantCotisation, memberOrder, totalCycles, currentCycleIndex, completedAt, createdAt, createdBy }`
- `UserProfile { uid, displayName, email, role, rang, hasBenefited, joinedAt, mustResetPassword }`

### 3.2 New model: AdminLog

**Collection:** `/admin_logs/{logId}`

```typescript
// src/app/core/models/admin-log.model.ts
export type AdminLogAction = 'force_close_saison' | 'exclude_member';

export interface AdminLog {
  id: string;
  action: AdminLogAction;
  targetDeptId: string;
  targetId: string;        // saisonId or userId
  reason: string;          // mandatory comment
  performedBy: string;     // super_admin uid
  performedAt: Timestamp;
}
```

---

## 4. SuperAdminService

**File:** `src/app/features/super-admin/super-admin.service.ts`

Centralized service, no internal state. All reads are real-time via `collectionData`/`docData`. All writes go through `httpsCallable`.

```typescript
watchDepartments(): Observable<Department[]>
  // collectionData('departments', { idField: 'id' })

watchPendingRequests(): Observable<DepartmentRequest[]>
  // collectionData query: status == 'pending', idField: 'id'

watchDeptDetail(deptId: string): Observable<{
  dept: Department;
  saison: Saison | null;
  members: UserProfile[];
}>
  // combineLatest of:
  //   docData(`departments/${deptId}`, { idField: 'id' })
  //   collectionData(`departments/${deptId}/saisons`, status=='active') → first or null
  //   collectionData(`departments/${deptId}/users`, { idField: 'uid' })

approveRequest(requestId: string): Promise<void>
  // httpsCallable 'provisionDepartment' → { requestId }

rejectRequest(requestId: string, reason: string): Promise<void>
  // httpsCallable 'rejectDepartmentRequest' → { requestId, reason }

forceCloseSaison(deptId: string, saisonId: string, reason: string): Promise<void>
  // httpsCallable 'forceSaisonClose' → { deptId, saisonId, reason }

excludeMember(deptId: string, userId: string, reason: string): Promise<void>
  // httpsCallable 'excludeMember' → { deptId, userId, reason }
```

> **Note on `rejectRequest`:** The existing `DeptRequestsComponent` prototype had no rejection. A new lightweight CF `reject-department-request.ts` handles rejection (sets `status: 'rejected'` + writes reason). Alternatively, direct Firestore write could be used here — but for consistency and auditability, it goes through a CF.

---

## 5. Components

### 5.1 Shell — `SuperAdminDashboardComponent` (rebuild)

**Files:**
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts`
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.html`
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.scss`

**Responsibility:** Layout only — sidenav + `<router-outlet>`. No data fetching.

**Sidenav links:**
- "Départements" → `/admin/departments` (badge: total dept count)
- "Demandes" → `/admin/requests` (badge rouge: pending request count)

Both badges pull from `SuperAdminService` via `toSignal`.

**Template structure:**
```html
<mat-sidenav-container>
  <mat-sidenav mode="side" opened>
    <nav>
      <a routerLink="departments" routerLinkActive="active">
        Départements
        <span class="sa-nav__badge">{{ deptCount() }}</span>
      </a>
      <a routerLink="requests" routerLinkActive="active">
        Demandes
        @if (pendingCount() > 0) {
          <span class="sa-nav__badge sa-nav__badge--alert">{{ pendingCount() }}</span>
        }
      </a>
    </nav>
    <button mat-button (click)="logout()">Déconnexion</button>
  </mat-sidenav>
  <mat-sidenav-content>
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

### 5.2 `DeptListComponent`

**Files:**
- `src/app/features/super-admin/dept-list/dept-list.component.ts`
- `src/app/features/super-admin/dept-list/dept-list.component.html`
- `src/app/features/super-admin/dept-list/dept-list.component.scss`

**Responsibility:** List all departments + lazy stats header.

**Stats (computed from `departments()` signal, no extra Firestore read):**
- Nb départements actifs = `departments().filter(d => d.status === 'active').length`
- Nb départements en attente = `departments().filter(d => d.status === 'pending').length`
- Nb total = `departments().length`

**Template pattern:**
```
@if (loading()) { skeleton }
@else if (error()) { error message }
@else {
  stats header (3 chips)
  mat-table with columns: name | status | createdAt | actions
  "Voir détail" button → /admin/departments/:deptId
}
```

### 5.3 `DeptDetailComponent`

**Files:**
- `src/app/features/super-admin/dept-detail/dept-detail.component.ts`
- `src/app/features/super-admin/dept-detail/dept-detail.component.html`
- `src/app/features/super-admin/dept-detail/dept-detail.component.scss`

**Responsibility:** Read-only dept view + two exceptional intervention buttons.

**Reads `deptId` from** `ActivatedRoute.params` via `inject(ActivatedRoute)`.

**Content sections:**
1. **Infos département** — nom, statut, date création, email admin
2. **Saison active** (if exists) — statut, mode, currentCycleIndex/totalCycles, montantCotisation, nb membres
3. **Liste des membres** — mat-table: displayName | email | rôle | rang | hasBenefited | actions
   - "Exclure" button per member — disabled if member is beneficiary of open cycle (i.e., `member.rang === saison.currentCycleIndex && openCycleExists`)
4. **Interventions exceptionnelles** (shown only if saison active):
   - Button "Clôturer la saison" → opens `ConfirmDialogComponent` with mandatory comment field

**`openCycleExists` determination:** Needs cycle status. `watchDeptDetail` returns saison doc; a separate sub-observable reads the active cycle from `saisons/{id}/cycles` where `status == 'open'`. If found, beneficiary exclusion is blocked.

**Revised `watchDeptDetail` signature:**
```typescript
watchDeptDetail(deptId: string): Observable<{
  dept: Department;
  saison: Saison | null;
  currentBeneficiaryUid: string | null;  // uid of open cycle beneficiary, or null
  members: UserProfile[];
}>
```

`currentBeneficiaryUid` = `saison.memberOrder[saison.currentCycleIndex - 1]` when an open cycle exists, null otherwise. This avoids an extra Firestore read (uses data already in saison doc + open cycle query).

### 5.4 `DeptRequestsComponent` (rebuild)

**Files:**
- `src/app/features/super-admin/requests/dept-requests.component.ts`
- `src/app/features/super-admin/requests/dept-requests.component.html`
- `src/app/features/super-admin/requests/dept-requests.component.scss` (new)

**Responsibility:** Real-time list of pending requests with Approve/Reject actions.

Existing prototype used `getDocs` (one-shot) and had no rejection. Rebuilt with `collectionData` real-time and two actions.

**Template pattern:**
```
@if (loading()) { skeleton }
@else if (requests().length === 0) { "Aucune demande en attente" }
@else {
  mat-table: deptName | requesterName | requesterEmail | message | actions
  "Approuver" button → calls approveRequest (loading per row)
  "Rejeter" button → opens ConfirmDialogComponent with reason field → calls rejectRequest
}
```

### 5.5 `ConfirmDialogComponent`

**File:** `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.ts`

Reusable dialog used for interventions and request rejection. Receives `MAT_DIALOG_DATA`:
```typescript
interface ConfirmDialogData {
  title: string;
  message: string;
  requiresComment: boolean;        // shows textarea if true
  commentLabel?: string;           // e.g. "Raison de la clôture"
  confirmLabel?: string;           // defaults to "Confirmer"
  dangerMode?: boolean;            // red confirm button
}
```
Returns: `{ confirmed: true, comment: string } | undefined` (undefined = cancelled).

---

## 6. Cloud Functions

### 6.1 `forceSaisonClose` — `functions/src/force-saison-close.ts`

**Guard:** `request.auth.token['role'] !== 'super_admin'`

**Input:** `{ deptId: string, saisonId: string, reason: string }`

**Steps:**
1. Verify saison exists and `status === 'active'`
2. Find open cycle in `saisons/{saisonId}/cycles` where `status == 'open'`; if found, close it (`status: 'closed'`, `closedAt: now`, `closedBy: 'super_admin'`)
3. Set `saison.status = 'completed'`, `saison.completedAt = now` — batch write
4. Write to `/admin_logs`: `{ action: 'force_close_saison', targetDeptId: deptId, targetId: saisonId, reason, performedBy: request.auth.uid, performedAt: now }`
5. Return `{ success: true }`

### 6.2 `excludeMember` — `functions/src/exclude-member.ts`

**Guard:** `request.auth.token['role'] !== 'super_admin'`

**Input:** `{ deptId: string, userId: string, reason: string }`

**Steps:**
1. Read active saison for the dept; if exists, check open cycle
2. If open cycle exists and `saison.memberOrder[saison.currentCycleIndex - 1] === userId` → throw `failed-precondition: 'Ce membre est bénéficiaire du cycle en cours.'`
3. Batch write:
   - Delete `departments/${deptId}/users/${userId}`
   - If active saison: update `saison.memberOrder` to remove `userId`
4. Write to `/admin_logs`: `{ action: 'exclude_member', targetDeptId: deptId, targetId: userId, reason, performedBy: request.auth.uid, performedAt: now }`
5. Return `{ success: true }`

### 6.3 `rejectDepartmentRequest` — `functions/src/reject-department-request.ts`

**Guard:** `request.auth.token['role'] !== 'super_admin'`

**Input:** `{ requestId: string, reason: string }`

**Steps:**
1. Verify request exists and `status === 'pending'`
2. Update `department_requests/{requestId}`: `{ status: 'rejected', rejectedAt: now, rejectionReason: reason }`
3. Return `{ success: true }`

---

## 7. `DepartmentRequest` model update

Add optional fields to support rejection:
```typescript
export interface DepartmentRequest {
  // existing fields...
  rejectedAt?: Timestamp;
  rejectionReason?: string;
}
```

---

## 8. `index.ts` exports to add

```typescript
export { forceSaisonClose } from './force-saison-close.js';
export { excludeMember } from './exclude-member.js';
export { rejectDepartmentRequest } from './reject-department-request.js';
```

---

## 9. Error Handling

- All components: `error = signal<string | null>(null)` — reset on retry, shown via `@if (error())` alert block
- All CF calls: catch `FirebaseError`, map code to French message via shared `mapFirebaseError()` helper (already exists in codebase)
- `DeptDetailComponent`: intervention buttons individually have `loading` signals to avoid double-submit
- `excludeMember` CF returns `failed-precondition` if member is active beneficiary → displayed as inline error (not toast)

---

## 10. Design System

Consistent with the rest of the app:
- BEM naming: `sa-dashboard__*`, `sa-dept-list__*`, `sa-dept-detail__*`, `sa-requests__*`
- CSS tokens: `var(--space-*)`, `var(--color-*)`, `var(--font-size-*)`, `var(--radius-*)`, `var(--shadow-*)`
- Skeleton loaders via `NgxSkeletonLoaderModule` (already installed)
- `mat-raised-button color="warn"` for destructive actions
- `mat-chip` for status badges (active = green, pending = orange)

---

## 11. Testing

- `SuperAdminService`: unit test with Firestore emulator — verify each observable emits correct shape, each callable invokes correct CF name
- `DeptListComponent`: test that stats signals compute correctly from mock department list
- `DeptDetailComponent`: test that "Exclure" button is disabled when `currentBeneficiaryUid === member.uid`
- `ConfirmDialogComponent`: test that confirm button is disabled when `requiresComment && comment.trim() === ''`
- CF unit tests (Jest): `forceSaisonClose` — test precondition checks; `excludeMember` — test beneficiary guard

---

## 12. File Summary

**New files:**
- `src/app/core/models/admin-log.model.ts`
- `src/app/features/super-admin/super-admin.service.ts`
- `src/app/features/super-admin/dept-list/dept-list.component.ts`
- `src/app/features/super-admin/dept-list/dept-list.component.html`
- `src/app/features/super-admin/dept-list/dept-list.component.scss`
- `src/app/features/super-admin/dept-detail/dept-detail.component.ts`
- `src/app/features/super-admin/dept-detail/dept-detail.component.html`
- `src/app/features/super-admin/dept-detail/dept-detail.component.scss`
- `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.ts`
- `functions/src/force-saison-close.ts`
- `functions/src/exclude-member.ts`
- `functions/src/reject-department-request.ts`

**Rebuilt (full replace, no logic reuse):**
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts` → split into .ts + .html + .scss
- `src/app/features/super-admin/requests/dept-requests.component.ts` → split into .ts + .html + .scss

**Modified:**
- `src/app/features/super-admin/super-admin.routes.ts` — add departments + detail routes
- `src/app/core/models/department-request.model.ts` — add `rejectedAt?`, `rejectionReason?`
- `functions/src/index.ts` — add 3 new exports

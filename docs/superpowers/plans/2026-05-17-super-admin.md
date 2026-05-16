# Super Admin Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the prototype Super Admin module into production quality: real-time dept list + stats, request validation (approve/reject), read-only dept detail, and two exceptional interventions (force-close saison, exclude member) — all audited in `/admin_logs`.

**Architecture:** `SuperAdminService` provides four real-time observables and four callable wrappers. Each route component (`DeptListComponent`, `DeptDetailComponent`, `DeptRequestsComponent`) is autonomous and uses `toSignal()`. Exceptional interventions go through new Cloud Functions (`forceSaisonClose`, `excludeMember`), never direct Firestore writes.

**Tech Stack:** Angular 18 standalone, `@angular/fire` (collectionData, docData, httpsCallable), Firebase Functions v2 `onCall`, `toSignal`, `computed`, `signal`, Angular Material, Jest (angular tests only — no CF test infra exists in the functions/ directory).

---

## File Map

**New files:**
- `src/app/core/models/admin-log.model.ts`
- `src/app/features/super-admin/super-admin.service.ts`
- `src/app/features/super-admin/super-admin.service.spec.ts`
- `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.ts` ← super-admin-specific, NOT the shared one
- `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.html`
- `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.scss`
- `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.spec.ts`
- `src/app/features/super-admin/dept-list/dept-list.component.ts`
- `src/app/features/super-admin/dept-list/dept-list.component.html`
- `src/app/features/super-admin/dept-list/dept-list.component.scss`
- `src/app/features/super-admin/dept-list/dept-list.component.spec.ts`
- `src/app/features/super-admin/dept-detail/dept-detail.component.ts`
- `src/app/features/super-admin/dept-detail/dept-detail.component.html`
- `src/app/features/super-admin/dept-detail/dept-detail.component.scss`
- `src/app/features/super-admin/dept-detail/dept-detail.component.spec.ts`
- `functions/src/reject-department-request.ts`
- `functions/src/force-saison-close.ts`
- `functions/src/exclude-member.ts`

**Rebuilt (full replace, no logic reuse):**
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts`
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.html` ← new
- `src/app/features/super-admin/dashboard/super-admin-dashboard.component.scss` ← new
- `src/app/features/super-admin/requests/dept-requests.component.ts`
- `src/app/features/super-admin/requests/dept-requests.component.html` ← new
- `src/app/features/super-admin/requests/dept-requests.component.scss` ← new

**Modified:**
- `src/app/features/super-admin/super-admin.routes.ts`
- `src/app/core/models/department-request.model.ts`
- `functions/src/index.ts`

---

## Task 1: Models

**Files:**
- Create: `src/app/core/models/admin-log.model.ts`
- Modify: `src/app/core/models/department-request.model.ts`

- [ ] **Step 1: Create AdminLog model**

```typescript
// src/app/core/models/admin-log.model.ts
import { Timestamp } from 'firebase/firestore';

export type AdminLogAction = 'force_close_saison' | 'exclude_member';

export interface AdminLog {
  id: string;
  action: AdminLogAction;
  targetDeptId: string;
  targetId: string;
  reason: string;
  performedBy: string;
  performedAt: Timestamp;
}
```

- [ ] **Step 2: Update DepartmentRequest model**

Replace the full content of `src/app/core/models/department-request.model.ts`:

```typescript
import { Timestamp } from 'firebase/firestore';

export type DepartmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DepartmentRequest {
  id: string;
  requesterEmail: string;
  requesterName: string;
  deptName: string;
  message: string;
  status: DepartmentRequestStatus;
  createdAt: Timestamp;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
}
```

- [ ] **Step 3: Run build to verify types compile**

```bash
cd /home/tilstack/Bureau/tontine-web && npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/core/models/admin-log.model.ts src/app/core/models/department-request.model.ts
git commit -m "feat(super-admin): add AdminLog model and extend DepartmentRequest with rejection fields"
```

---

## Task 2: SuperAdminService

**Files:**
- Create: `src/app/features/super-admin/super-admin.service.ts`
- Create: `src/app/features/super-admin/super-admin.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/super-admin/super-admin.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SuperAdminService } from './super-admin.service';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let firestoreMock: any;
  let functionsMock: any;

  beforeEach(() => {
    firestoreMock = {};
    functionsMock = {};

    TestBed.configureTestingModule({
      providers: [
        SuperAdminService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: Functions, useValue: functionsMock },
      ],
    });
    service = TestBed.inject(SuperAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="super-admin.service.spec" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './super-admin.service'`.

- [ ] **Step 3: Implement SuperAdminService**

```typescript
// src/app/features/super-admin/super-admin.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Department } from '../../core/models/department.model';
import { DepartmentRequest } from '../../core/models/department-request.model';
import { Saison } from '../../core/models/saison.model';
import { UserProfile } from '../../core/models/user.model';

export interface DeptDetail {
  dept: Department;
  saison: Saison | null;
  currentBeneficiaryUid: string | null;
  members: UserProfile[];
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchDepartments(): Observable<Department[]> {
    return collectionData(
      collection(this.firestore, 'departments'),
      { idField: 'id' }
    ) as Observable<Department[]>;
  }

  watchPendingRequests(): Observable<DepartmentRequest[]> {
    return collectionData(
      query(
        collection(this.firestore, 'department_requests'),
        where('status', '==', 'pending')
      ),
      { idField: 'id' }
    ) as Observable<DepartmentRequest[]>;
  }

  watchDeptDetail(deptId: string): Observable<DeptDetail | null> {
    const dept$ = docData(
      doc(this.firestore, `departments/${deptId}`),
      { idField: 'id' }
    ) as Observable<Department | undefined>;

    const saison$ = (collectionData(
      query(
        collection(this.firestore, `departments/${deptId}/saisons`),
        where('status', '==', 'active'),
        limit(1)
      ),
      { idField: 'id' }
    ) as Observable<Saison[]>).pipe(map((s) => s[0] ?? null));

    const members$ = collectionData(
      collection(this.firestore, `departments/${deptId}/users`),
      { idField: 'uid' }
    ) as Observable<UserProfile[]>;

    return combineLatest([dept$, saison$, members$]).pipe(
      switchMap(([dept, saison, members]) => {
        if (!dept) return of(null);
        if (!saison) {
          return of({ dept, saison: null, currentBeneficiaryUid: null, members });
        }
        const openCycle$ = (collectionData(
          query(
            collection(
              this.firestore,
              `departments/${deptId}/saisons/${saison.id}/cycles`
            ),
            where('status', '==', 'open'),
            limit(1)
          ),
          { idField: 'id' }
        ) as Observable<Array<{ id: string }>>).pipe(
          map((cycles) =>
            cycles.length ? (saison.memberOrder[saison.currentCycleIndex] ?? null) : null
          )
        );
        return openCycle$.pipe(
          map((currentBeneficiaryUid) => ({ dept, saison, currentBeneficiaryUid, members }))
        );
      })
    );
  }

  approveRequest(requestId: string): Promise<void> {
    return httpsCallable(this.functions, 'provisionDepartment')({ requestId }).then(
      () => undefined
    );
  }

  rejectRequest(requestId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'rejectDepartmentRequest')({ requestId, reason }).then(
      () => undefined
    );
  }

  forceCloseSaison(deptId: string, saisonId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'forceSaisonClose')({ deptId, saisonId, reason }).then(
      () => undefined
    );
  }

  excludeMember(deptId: string, userId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'excludeMember')({ deptId, userId, reason }).then(
      () => undefined
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="super-admin.service.spec" 2>&1 | tail -15
```

Expected: PASS — 1 test passing.

- [ ] **Step 5: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/super-admin.service.ts src/app/features/super-admin/super-admin.service.spec.ts
git commit -m "feat(super-admin): add SuperAdminService with real-time observables and callable wrappers"
```

---

## Task 3: Super Admin ConfirmDialog

> **Context:** The existing `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` returns `boolean` and is used by other features. Do NOT modify it. Create a NEW component in the super-admin feature folder that returns `{ confirmed: true; comment: string }` and supports an optional mandatory comment field.

**Files:**
- Create: `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.ts`
- Create: `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.html`
- Create: `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.scss`
- Create: `src/app/features/super-admin/confirm-dialog/confirm-dialog.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/features/super-admin/confirm-dialog/confirm-dialog.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SaConfirmDialogComponent, SaConfirmDialogData } from './confirm-dialog.component';

function setup(data: SaConfirmDialogData) {
  const closeSpy = jest.fn();
  TestBed.configureTestingModule({
    imports: [SaConfirmDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: closeSpy } },
    ],
  });
  const f = TestBed.createComponent(SaConfirmDialogComponent);
  f.detectChanges();
  return { f, closeSpy };
}

describe('SaConfirmDialogComponent', () => {
  it('confirm button is disabled when requiresComment and comment is empty', () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(true);
  });

  it('confirm button is enabled after typing a comment', async () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    f.componentInstance.comment.set('Some reason');
    f.detectChanges();
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(false);
  });

  it('confirm() closes dialog with { confirmed: true, comment }', () => {
    const { f, closeSpy } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    f.componentInstance.comment.set('Force close reason');
    f.componentInstance.confirm();
    expect(closeSpy).toHaveBeenCalledWith({ confirmed: true, comment: 'Force close reason' });
  });

  it('cancel() closes dialog with undefined', () => {
    const { f, closeSpy } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: false,
      confirmLabel: 'OK',
      dangerMode: false,
    });
    f.componentInstance.cancel();
    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });

  it('confirm button is enabled when requiresComment is false even with empty comment', () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: false,
      confirmLabel: 'OK',
      dangerMode: false,
    });
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="super-admin/confirm-dialog" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './confirm-dialog.component'`.

- [ ] **Step 3: Implement the component TS**

```typescript
// src/app/features/super-admin/confirm-dialog/confirm-dialog.component.ts
import { Component, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface SaConfirmDialogData {
  title: string;
  message: string;
  requiresComment: boolean;
  commentLabel?: string;
  confirmLabel?: string;
  dangerMode?: boolean;
}

export interface SaConfirmDialogResult {
  confirmed: true;
  comment: string;
}

@Component({
  selector: 'app-sa-confirm-dialog',
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions,
    MatButton, MatFormField, MatLabel, MatInput, FormsModule,
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class SaConfirmDialogComponent {
  data = inject<SaConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SaConfirmDialogComponent>);

  comment = signal('');

  get confirmDisabled(): boolean {
    return this.data.requiresComment && this.comment().trim() === '';
  }

  confirm(): void {
    this.dialogRef.close({ confirmed: true, comment: this.comment() } satisfies SaConfirmDialogResult);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}
```

- [ ] **Step 4: Implement the template**

```html
<!-- src/app/features/super-admin/confirm-dialog/confirm-dialog.component.html -->
<h2 mat-dialog-title>{{ data.title }}</h2>

<mat-dialog-content>
  <p class="sa-confirm__message">{{ data.message }}</p>
  @if (data.requiresComment) {
    <mat-form-field appearance="outline" class="sa-confirm__field">
      <mat-label>{{ data.commentLabel ?? 'Commentaire' }}</mat-label>
      <textarea
        matInput
        rows="3"
        [ngModel]="comment()"
        (ngModelChange)="comment.set($event)">
      </textarea>
    </mat-form-field>
  }
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="cancel()">Annuler</button>
  <button
    class="sa-confirm__confirm-btn"
    mat-raised-button
    [color]="data.dangerMode ? 'warn' : 'primary'"
    [disabled]="confirmDisabled"
    (click)="confirm()">
    {{ data.confirmLabel ?? 'Confirmer' }}
  </button>
</mat-dialog-actions>
```

- [ ] **Step 5: Implement the styles**

```scss
// src/app/features/super-admin/confirm-dialog/confirm-dialog.component.scss
.sa-confirm {
  &__message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-3);
  }

  &__field {
    width: 100%;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="super-admin/confirm-dialog" 2>&1 | tail -15
```

Expected: PASS — 5 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/confirm-dialog/
git commit -m "feat(super-admin): add SaConfirmDialogComponent with optional mandatory comment field"
```

---

## Task 4: Cloud Functions

**Files:**
- Create: `functions/src/reject-department-request.ts`
- Create: `functions/src/force-saison-close.ts`
- Create: `functions/src/exclude-member.ts`

> **Context:** There is no Jest setup in the `functions/` directory. These CFs can be tested manually with the Firebase emulator. The CF pattern follows `functions/src/provision-department.ts` and `functions/src/force-close-cycle.ts`. All three CFs check `request.auth.token['role'] !== 'super_admin'` first, write to `/admin_logs`, and return `{ success: true }`.

- [ ] **Step 1: Create `reject-department-request.ts`**

```typescript
// functions/src/reject-department-request.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const rejectDepartmentRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { requestId, reason } = request.data as { requestId: string; reason: string };
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId requis.');
  if (!reason?.trim()) throw new HttpsError('invalid-argument', 'reason requis.');

  const ref = admin.firestore().collection('department_requests').doc(requestId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError('not-found', 'Demande introuvable.');
  if (snap.data()!['status'] !== 'pending') {
    throw new HttpsError('failed-precondition', 'Cette demande a déjà été traitée.');
  }

  const now = admin.firestore.Timestamp.now();
  await ref.update({
    status: 'rejected',
    rejectedAt: now,
    rejectionReason: reason.trim(),
  });

  return { success: true };
});
```

- [ ] **Step 2: Create `force-saison-close.ts`**

```typescript
// functions/src/force-saison-close.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const forceSaisonClose = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { deptId, saisonId, reason } = request.data as {
    deptId: string;
    saisonId: string;
    reason: string;
  };
  if (!deptId || !saisonId) {
    throw new HttpsError('invalid-argument', 'deptId et saisonId requis.');
  }
  if (!reason?.trim()) throw new HttpsError('invalid-argument', 'reason requis.');

  const db = admin.firestore();
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const saisonSnap = await saisonRef.get();

  if (!saisonSnap.exists) throw new HttpsError('not-found', 'Saison introuvable.');
  if (saisonSnap.data()!['status'] !== 'active') {
    throw new HttpsError('failed-precondition', "La saison n'est pas active.");
  }

  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();

  const openCyclesSnap = await db
    .collection(`departments/${deptId}/saisons/${saisonId}/cycles`)
    .where('status', '==', 'open')
    .limit(1)
    .get();

  if (!openCyclesSnap.empty) {
    batch.update(openCyclesSnap.docs[0].ref, {
      status: 'closed',
      closedAt: now,
      closedBy: 'super_admin',
    });
  }

  batch.update(saisonRef, { status: 'completed', completedAt: now });
  await batch.commit();

  await db.collection('admin_logs').add({
    action: 'force_close_saison',
    targetDeptId: deptId,
    targetId: saisonId,
    reason: reason.trim(),
    performedBy: request.auth.uid,
    performedAt: now,
  });

  return { success: true };
});
```

- [ ] **Step 3: Create `exclude-member.ts`**

```typescript
// functions/src/exclude-member.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const excludeMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { deptId, userId, reason } = request.data as {
    deptId: string;
    userId: string;
    reason: string;
  };
  if (!deptId || !userId) {
    throw new HttpsError('invalid-argument', 'deptId et userId requis.');
  }
  if (!reason?.trim()) throw new HttpsError('invalid-argument', 'reason requis.');

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const saisonsSnap = await db
    .collection(`departments/${deptId}/saisons`)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  let activeSaisonRef: admin.firestore.DocumentReference | null = null;
  let currentMemberOrder: string[] = [];

  if (!saisonsSnap.empty) {
    const saisonDoc = saisonsSnap.docs[0];
    const saisonData = saisonDoc.data();
    activeSaisonRef = saisonDoc.ref;
    currentMemberOrder = saisonData['memberOrder'] as string[];
    const currentCycleIndex: number = saisonData['currentCycleIndex'];

    const openCyclesSnap = await db
      .collection(`departments/${deptId}/saisons/${saisonDoc.id}/cycles`)
      .where('status', '==', 'open')
      .limit(1)
      .get();

    if (!openCyclesSnap.empty && currentMemberOrder[currentCycleIndex] === userId) {
      throw new HttpsError(
        'failed-precondition',
        'Ce membre est bénéficiaire du cycle en cours et ne peut pas être exclu.'
      );
    }
  }

  const batch = db.batch();
  batch.delete(db.doc(`departments/${deptId}/users/${userId}`));

  if (activeSaisonRef && currentMemberOrder.includes(userId)) {
    batch.update(activeSaisonRef, {
      memberOrder: currentMemberOrder.filter((uid) => uid !== userId),
    });
  }

  await batch.commit();

  await db.collection('admin_logs').add({
    action: 'exclude_member',
    targetDeptId: deptId,
    targetId: userId,
    reason: reason.trim(),
    performedBy: request.auth.uid,
    performedAt: now,
  });

  return { success: true };
});
```

- [ ] **Step 4: Verify CF TypeScript compiles**

```bash
cd /home/tilstack/Bureau/tontine-web/functions && npm run build 2>&1 | tail -20
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add functions/src/reject-department-request.ts functions/src/force-saison-close.ts functions/src/exclude-member.ts
git commit -m "feat(super-admin): add forceSaisonClose, excludeMember, rejectDepartmentRequest Cloud Functions"
```

---

## Task 5: Wire index.ts and Routes

**Files:**
- Modify: `functions/src/index.ts`
- Modify: `src/app/features/super-admin/super-admin.routes.ts`

- [ ] **Step 1: Add CF exports to index.ts**

In `functions/src/index.ts`, after the `// Caisse module` block, add:

```typescript
// Super Admin interventions
export { rejectDepartmentRequest } from './reject-department-request.js';
export { forceSaisonClose } from './force-saison-close.js';
export { excludeMember } from './exclude-member.js';
```

- [ ] **Step 2: Replace super-admin.routes.ts**

```typescript
// src/app/features/super-admin/super-admin.routes.ts
import { Routes } from '@angular/router';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/super-admin-dashboard.component').then(
        (m) => m.SuperAdminDashboardComponent
      ),
    children: [
      { path: '', redirectTo: 'departments', pathMatch: 'full' },
      {
        path: 'departments',
        loadComponent: () =>
          import('./dept-list/dept-list.component').then((m) => m.DeptListComponent),
      },
      {
        path: 'departments/:deptId',
        loadComponent: () =>
          import('./dept-detail/dept-detail.component').then((m) => m.DeptDetailComponent),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./requests/dept-requests.component').then((m) => m.DeptRequestsComponent),
      },
    ],
  },
];
```

- [ ] **Step 3: Build to verify no import errors**

```bash
cd /home/tilstack/Bureau/tontine-web/functions && npm run build 2>&1 | tail -10
cd /home/tilstack/Bureau/tontine-web && npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20
```

Expected: both commands produce no errors.

- [ ] **Step 4: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add functions/src/index.ts src/app/features/super-admin/super-admin.routes.ts
git commit -m "feat(super-admin): wire CF exports and update routes with departments + detail"
```

---

## Task 6: Shell Rebuild (SuperAdminDashboardComponent)

> **Context:** The existing `super-admin-dashboard.component.ts` uses an inline template with `style=""` attributes and only one nav link. Replace it completely with separate `.html` and `.scss` files. The shell's only job is layout — sidenav + `<router-outlet>`. Badges pull from `SuperAdminService` via `toSignal`.

**Files:**
- Modify: `src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts`
- Create: `src/app/features/super-admin/dashboard/super-admin-dashboard.component.html`
- Create: `src/app/features/super-admin/dashboard/super-admin-dashboard.component.scss`

- [ ] **Step 1: Replace the TS file**

```typescript
// src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatNavList, MatListItem } from '@angular/material/list';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { SuperAdminService } from '../super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenav, MatSidenavContainer, MatSidenavContent,
    MatNavList, MatListItem,
    MatButton,
  ],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.scss',
})
export class SuperAdminDashboardComponent {
  private auth = inject(AuthService);
  private saService = inject(SuperAdminService);

  private departments = toSignal(this.saService.watchDepartments(), { initialValue: [] });
  private requests = toSignal(this.saService.watchPendingRequests(), { initialValue: [] });

  deptCount = computed(() => this.departments().length);
  pendingCount = computed(() => this.requests().length);

  logout(): void {
    this.auth.logout();
  }
}
```

- [ ] **Step 2: Create the template**

```html
<!-- src/app/features/super-admin/dashboard/super-admin-dashboard.component.html -->
<mat-sidenav-container class="sa-dashboard">
  <mat-sidenav mode="side" opened class="sa-dashboard__nav">
    <p class="sa-dashboard__brand">Super Admin</p>
    <mat-nav-list>
      <a
        mat-list-item
        routerLink="departments"
        routerLinkActive="sa-dashboard__nav-item--active">
        <span class="sa-dashboard__nav-label">
          Départements
          <span class="sa-nav__badge">{{ deptCount() }}</span>
        </span>
      </a>
      <a
        mat-list-item
        routerLink="requests"
        routerLinkActive="sa-dashboard__nav-item--active">
        <span class="sa-dashboard__nav-label">
          Demandes
          @if (pendingCount() > 0) {
            <span class="sa-nav__badge sa-nav__badge--alert">{{ pendingCount() }}</span>
          }
        </span>
      </a>
    </mat-nav-list>
    <button mat-stroked-button class="sa-dashboard__logout" (click)="logout()">
      Déconnexion
    </button>
  </mat-sidenav>
  <mat-sidenav-content class="sa-dashboard__content">
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

- [ ] **Step 3: Create the styles**

```scss
// src/app/features/super-admin/dashboard/super-admin-dashboard.component.scss
.sa-dashboard {
  height: 100vh;

  &__nav {
    width: 220px;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
  }

  &__brand {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-3);
    padding: 0 var(--space-2);
  }

  &__nav-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
  }

  &__nav-item--active {
    background: var(--color-surface-alt);
    border-radius: var(--radius-md);
  }

  &__logout {
    margin-top: auto;
    width: 100%;
  }

  &__content {
    padding: var(--space-4);
  }
}

.sa-nav {
  &__badge {
    margin-left: auto;
    background: var(--color-surface-alt);
    color: var(--color-text-secondary);
    border-radius: var(--radius-full);
    padding: 2px 8px;
    font-size: var(--font-size-xs);
    font-weight: 600;

    &--alert {
      background: var(--color-error);
      color: #fff;
    }
  }
}
```

- [ ] **Step 4: Build to verify**

```bash
cd /home/tilstack/Bureau/tontine-web && npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/dashboard/
git commit -m "feat(super-admin): rebuild shell with sidenav, badge counts, and external template/styles"
```

---

## Task 7: DeptListComponent

**Files:**
- Create: `src/app/features/super-admin/dept-list/dept-list.component.ts`
- Create: `src/app/features/super-admin/dept-list/dept-list.component.html`
- Create: `src/app/features/super-admin/dept-list/dept-list.component.scss`
- Create: `src/app/features/super-admin/dept-list/dept-list.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/features/super-admin/dept-list/dept-list.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DeptListComponent } from './dept-list.component';
import { SuperAdminService } from '../super-admin.service';
import { Department } from '../../../core/models/department.model';

const mockDepts: Department[] = [
  {
    id: 'd1', name: 'Dept A', adminId: 'u1', status: 'active',
    createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
    settings: {},
  },
  {
    id: 'd2', name: 'Dept B', adminId: 'u2', status: 'pending',
    createdAt: { seconds: 2000, nanoseconds: 0, toDate: () => new Date(2000000) } as any,
    settings: {},
  },
  {
    id: 'd3', name: 'Dept C', adminId: 'u3', status: 'active',
    createdAt: { seconds: 3000, nanoseconds: 0, toDate: () => new Date(3000000) } as any,
    settings: {},
  },
];

describe('DeptListComponent', () => {
  it('shows skeleton when data is loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SuperAdminService, useValue: { watchDepartments: () => NEVER } },
      ],
    });
    const f = TestBed.createComponent(DeptListComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-dept-list-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    async function setup(depts: Department[]) {
      await TestBed.configureTestingModule({
        imports: [DeptListComponent, NoopAnimationsModule],
        providers: [
          provideRouter([]),
          {
            provide: SuperAdminService,
            useValue: { watchDepartments: () => of(depts) },
          },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(DeptListComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      return f;
    }

    it('computes activeCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.activeCount()).toBe(2);
    });

    it('computes pendingCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.pendingCount()).toBe(1);
    });

    it('computes totalCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.totalCount()).toBe(3);
    });

    it('renders a row per department', async () => {
      const f = await setup(mockDepts);
      const rows = f.nativeElement.querySelectorAll('tr[mat-row]');
      expect(rows.length).toBe(3);
    });

    it('shows empty state when no departments', async () => {
      const f = await setup([]);
      expect(f.nativeElement.textContent).toContain('Aucun département');
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-list.component.spec" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './dept-list.component'`.

- [ ] **Step 3: Implement the TS**

```typescript
// src/app/features/super-admin/dept-list/dept-list.component.ts
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../super-admin.service';

@Component({
  selector: 'app-dept-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
    MatChip, MatChipSet,
    DatePipe,
  ],
  templateUrl: './dept-list.component.html',
  styleUrl: './dept-list.component.scss',
})
export class DeptListComponent {
  private saService = inject(SuperAdminService);

  departments = toSignal(this.saService.watchDepartments());

  activeCount = computed(() => this.departments()?.filter((d) => d.status === 'active').length ?? 0);
  pendingCount = computed(() => this.departments()?.filter((d) => d.status === 'pending').length ?? 0);
  totalCount = computed(() => this.departments()?.length ?? 0);

  displayedColumns = ['name', 'status', 'createdAt', 'actions'];
}
```

- [ ] **Step 4: Implement the template**

```html
<!-- src/app/features/super-admin/dept-list/dept-list.component.html -->
@if (departments() === undefined) {
  <div class="sa-dept-list-loading">
    <div class="skeleton sa-dept-list__skeleton-stats"></div>
    <div class="skeleton sa-dept-list__skeleton-row"></div>
    <div class="skeleton sa-dept-list__skeleton-row"></div>
    <div class="skeleton sa-dept-list__skeleton-row"></div>
  </div>
} @else {
  <div class="sa-dept-list">
    <div class="sa-dept-list__stats">
      <mat-chip-set>
        <mat-chip>{{ totalCount() }} département(s)</mat-chip>
        <mat-chip class="sa-dept-list__chip--active">{{ activeCount() }} actif(s)</mat-chip>
        @if (pendingCount() > 0) {
          <mat-chip class="sa-dept-list__chip--pending">{{ pendingCount() }} en attente</mat-chip>
        }
      </mat-chip-set>
    </div>

    @if (!departments()!.length) {
      <p class="sa-dept-list__empty">Aucun département enregistré.</p>
    } @else {
      <div class="sa-dept-list__table-wrapper">
        <table mat-table [dataSource]="departments()!" class="sa-dept-list__table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let dept">{{ dept.name }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let dept">
              <span [class]="'sa-dept-list__badge sa-dept-list__badge--' + dept.status">
                {{ dept.status === 'active' ? 'Actif' : 'En attente' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Créé le</th>
            <td mat-cell *matCellDef="let dept">
              {{ dept.createdAt?.toDate() | date:'d MMM yyyy' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let dept">
              <a mat-button [routerLink]="['/admin/departments', dept.id]">Voir détail</a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    }
  </div>
}
```

- [ ] **Step 5: Implement the styles**

```scss
// src/app/features/super-admin/dept-list/dept-list.component.scss
.sa-dept-list-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sa-dept-list {
  &__skeleton-stats {
    height: 40px;
    border-radius: var(--radius-full);
    width: 280px;
  }

  &__skeleton-row {
    height: 48px;
  }

  &__stats {
    margin-bottom: var(--space-3);
  }

  &__empty {
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__table-wrapper {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
  }

  &__badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;

    &--active {
      background: color-mix(in srgb, var(--color-success) 15%, transparent);
      color: var(--color-success);
    }

    &--pending {
      background: color-mix(in srgb, var(--color-warning) 15%, transparent);
      color: var(--color-warning);
    }
  }

  &__chip--active {
    --mdc-chip-label-text-color: var(--color-success);
  }

  &__chip--pending {
    --mdc-chip-label-text-color: var(--color-warning);
  }
}
```

- [ ] **Step 6: Run tests**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-list.component.spec" 2>&1 | tail -15
```

Expected: PASS — 7 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/dept-list/
git commit -m "feat(super-admin): add DeptListComponent with real-time list and computed stats"
```

---

## Task 8: DeptRequestsComponent Rebuild

> **Context:** The existing `dept-requests.component.ts` uses an inline template and `getDocs` one-shot (no real-time). Replace it completely with `toSignal` (real-time) and add reject functionality. The existing `.ts` file replaces both itself and becomes the basis for `.html` + `.scss` files.

**Files:**
- Modify: `src/app/features/super-admin/requests/dept-requests.component.ts`
- Create: `src/app/features/super-admin/requests/dept-requests.component.html`
- Create: `src/app/features/super-admin/requests/dept-requests.component.scss`
- Create: `src/app/features/super-admin/requests/dept-requests.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/features/super-admin/requests/dept-requests.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { DeptRequestsComponent } from './dept-requests.component';
import { SuperAdminService } from '../super-admin.service';
import { DepartmentRequest } from '../../../core/models/department-request.model';

const mockRequest: DepartmentRequest = {
  id: 'req-1',
  requesterEmail: 'a@b.com',
  requesterName: 'Alice',
  deptName: 'Dept Alpha',
  message: 'Bonjour',
  status: 'pending',
  createdAt: { seconds: 1000, nanoseconds: 0 } as any,
};

describe('DeptRequestsComponent', () => {
  it('shows skeleton when loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptRequestsComponent, NoopAnimationsModule],
      providers: [
        { provide: SuperAdminService, useValue: { watchPendingRequests: () => NEVER } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(DeptRequestsComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-requests-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    let saMock: { watchPendingRequests: jest.Mock; approveRequest: jest.Mock; rejectRequest: jest.Mock };
    let dialogMock: { open: jest.Mock };

    beforeEach(async () => {
      saMock = {
        watchPendingRequests: jest.fn().mockReturnValue(of([mockRequest])),
        approveRequest: jest.fn().mockResolvedValue(undefined),
        rejectRequest: jest.fn().mockResolvedValue(undefined),
      };
      dialogMock = { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) };

      await TestBed.configureTestingModule({
        imports: [DeptRequestsComponent, NoopAnimationsModule],
        providers: [
          { provide: SuperAdminService, useValue: saMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('renders request rows', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Dept Alpha');
    });

    it('approve() calls saService.approveRequest with correct id', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      await f.componentInstance.approve('req-1');
      expect(saMock.approveRequest).toHaveBeenCalledWith('req-1');
    });

    it('openRejectDialog() opens SaConfirmDialogComponent', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      f.componentInstance.openRejectDialog('req-1');
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-requests.component.spec" 2>&1 | tail -15
```

Expected: FAIL.

- [ ] **Step 3: Replace the TS file**

```typescript
// src/app/features/super-admin/requests/dept-requests.component.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SuperAdminService } from '../super-admin.service';
import {
  SaConfirmDialogComponent,
  SaConfirmDialogData,
  SaConfirmDialogResult,
} from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dept-requests',
  standalone: true,
  imports: [
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
  ],
  templateUrl: './dept-requests.component.html',
  styleUrl: './dept-requests.component.scss',
})
export class DeptRequestsComponent {
  private saService = inject(SuperAdminService);
  private dialog = inject(MatDialog);

  requests = toSignal(this.saService.watchPendingRequests());
  loadingId = signal<string | null>(null);
  error = signal<string | null>(null);

  displayedColumns = ['deptName', 'requesterName', 'requesterEmail', 'message', 'actions'];

  async approve(requestId: string): Promise<void> {
    this.loadingId.set(requestId);
    this.error.set(null);
    try {
      await this.saService.approveRequest(requestId);
    } catch (err: any) {
      this.error.set(err?.message ?? "Erreur lors de l'approbation.");
    } finally {
      this.loadingId.set(null);
    }
  }

  openRejectDialog(requestId: string): void {
    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: 'Rejeter la demande',
            message: 'Cette action est irréversible. Indiquez la raison du rejet.',
            requiresComment: true,
            commentLabel: 'Raison du rejet',
            confirmLabel: 'Rejeter',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.loadingId.set(requestId);
        this.error.set(null);
        try {
          await this.saService.rejectRequest(requestId, result.comment);
        } catch (err: any) {
          this.error.set(err?.message ?? 'Erreur lors du rejet.');
        } finally {
          this.loadingId.set(null);
        }
      });
  }
}
```

- [ ] **Step 4: Create the template**

```html
<!-- src/app/features/super-admin/requests/dept-requests.component.html -->
@if (requests() === undefined) {
  <div class="sa-requests-loading">
    <div class="skeleton sa-requests__skeleton-row"></div>
    <div class="skeleton sa-requests__skeleton-row"></div>
    <div class="skeleton sa-requests__skeleton-row"></div>
  </div>
} @else {
  <div class="sa-requests">
    <h2 class="sa-requests__title">Demandes en attente</h2>

    @if (error()) {
      <p class="alert-error">{{ error() }}</p>
    }

    @if (!requests()!.length) {
      <p class="sa-requests__empty">Aucune demande en attente.</p>
    } @else {
      <div class="sa-requests__table-wrapper">
        <table mat-table [dataSource]="requests()!" class="sa-requests__table">

          <ng-container matColumnDef="deptName">
            <th mat-header-cell *matHeaderCellDef>Département</th>
            <td mat-cell *matCellDef="let r">{{ r.deptName }}</td>
          </ng-container>

          <ng-container matColumnDef="requesterName">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let r">{{ r.requesterName }}</td>
          </ng-container>

          <ng-container matColumnDef="requesterEmail">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let r">{{ r.requesterEmail }}</td>
          </ng-container>

          <ng-container matColumnDef="message">
            <th mat-header-cell *matHeaderCellDef>Message</th>
            <td mat-cell *matCellDef="let r" class="sa-requests__message-cell">
              {{ r.message }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r" class="sa-requests__actions-cell">
              <button
                mat-flat-button
                color="primary"
                [disabled]="loadingId() === r.id"
                (click)="approve(r.id)">
                Approuver
              </button>
              <button
                mat-stroked-button
                color="warn"
                [disabled]="loadingId() === r.id"
                (click)="openRejectDialog(r.id)">
                Rejeter
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    }
  </div>
}
```

- [ ] **Step 5: Create the styles**

```scss
// src/app/features/super-admin/requests/dept-requests.component.scss
.sa-requests-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sa-requests {
  &__skeleton-row {
    height: 48px;
  }

  &__title {
    margin: 0 0 var(--space-3);
  }

  &__empty {
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__table-wrapper {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
  }

  &__message-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__actions-cell {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-1) 0;
  }
}
```

- [ ] **Step 6: Run tests**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-requests.component.spec" 2>&1 | tail -15
```

Expected: PASS — 5 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/requests/
git commit -m "feat(super-admin): rebuild DeptRequestsComponent with real-time and reject action"
```

---

## Task 9: DeptDetailComponent

**Files:**
- Create: `src/app/features/super-admin/dept-detail/dept-detail.component.ts`
- Create: `src/app/features/super-admin/dept-detail/dept-detail.component.html`
- Create: `src/app/features/super-admin/dept-detail/dept-detail.component.scss`
- Create: `src/app/features/super-admin/dept-detail/dept-detail.component.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/features/super-admin/dept-detail/dept-detail.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeptDetailComponent } from './dept-detail.component';
import { SuperAdminService, DeptDetail } from '../super-admin.service';
import { UserProfile } from '../../../core/models/user.model';

const mockMember: UserProfile = {
  uid: 'u1',
  displayName: 'Alice',
  email: 'alice@a.com',
  role: 'membre',
  rang: 1,
  hasBenefited: false,
  joinedAt: { seconds: 1000, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const mockBeneficiary: UserProfile = {
  uid: 'u2',
  displayName: 'Bob',
  email: 'bob@b.com',
  role: 'membre',
  rang: 2,
  hasBenefited: false,
  joinedAt: { seconds: 2000, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const mockDetail: DeptDetail = {
  dept: {
    id: 'd1', name: 'Dept Alpha', adminId: 'u-admin', status: 'active',
    createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
    settings: {},
  },
  saison: {
    id: 's1', status: 'active', mode: 'fixed', montantCotisation: 10000,
    memberOrder: ['u2', 'u1'], totalCycles: 2, currentCycleIndex: 0,
    completedAt: null,
    createdAt: { seconds: 1000, nanoseconds: 0 } as any,
    createdBy: 'u-admin',
  },
  currentBeneficiaryUid: 'u2',
  members: [mockMember, mockBeneficiary],
};

describe('DeptDetailComponent', () => {
  it('shows skeleton when loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { params: NEVER } },
        { provide: SuperAdminService, useValue: { watchDeptDetail: () => NEVER } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(DeptDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-dept-detail-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    let saMock: {
      watchDeptDetail: jest.Mock;
      forceCloseSaison: jest.Mock;
      excludeMember: jest.Mock;
    };
    let dialogMock: { open: jest.Mock };

    beforeEach(async () => {
      saMock = {
        watchDeptDetail: jest.fn().mockReturnValue(of(mockDetail)),
        forceCloseSaison: jest.fn().mockResolvedValue(undefined),
        excludeMember: jest.fn().mockResolvedValue(undefined),
      };
      dialogMock = { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) };

      await TestBed.configureTestingModule({
        imports: [DeptDetailComponent, NoopAnimationsModule],
        providers: [
          { provide: ActivatedRoute, useValue: { params: of({ deptId: 'd1' }) } },
          { provide: SuperAdminService, useValue: saMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('renders dept name', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Dept Alpha');
    });

    it('isCurrentBeneficiary returns true for currentBeneficiaryUid member', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.isCurrentBeneficiary(mockBeneficiary)).toBe(true);
    });

    it('isCurrentBeneficiary returns false for non-beneficiary member', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.isCurrentBeneficiary(mockMember)).toBe(false);
    });

    it('openForceCloseDialog() opens SaConfirmDialogComponent', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      f.componentInstance.openForceCloseDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-detail.component.spec" 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module './dept-detail.component'`.

- [ ] **Step 3: Implement the TS**

```typescript
// src/app/features/super-admin/dept-detail/dept-detail.component.ts
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { SuperAdminService } from '../super-admin.service';
import { UserProfile } from '../../../core/models/user.model';
import {
  SaConfirmDialogComponent,
  SaConfirmDialogData,
  SaConfirmDialogResult,
} from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dept-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
    MatCard, MatCardContent, MatCardHeader, MatCardTitle,
    DatePipe, DecimalPipe,
  ],
  templateUrl: './dept-detail.component.html',
  styleUrl: './dept-detail.component.scss',
})
export class DeptDetailComponent {
  private route = inject(ActivatedRoute);
  private saService = inject(SuperAdminService);
  private dialog = inject(MatDialog);

  detail = toSignal(
    this.route.params.pipe(
      switchMap((params) => this.saService.watchDeptDetail(params['deptId']))
    )
  );

  interventionLoading = signal<'close' | 'exclude' | null>(null);
  interventionError = signal<string | null>(null);

  displayedColumns = ['displayName', 'email', 'role', 'rang', 'hasBenefited', 'actions'];

  isCurrentBeneficiary(member: UserProfile): boolean {
    const d = this.detail();
    if (!d) return false;
    return d.currentBeneficiaryUid === member.uid;
  }

  openForceCloseDialog(): void {
    const d = this.detail();
    if (!d?.saison) return;
    const { dept, saison } = d;

    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: 'Clôturer la saison',
            message: `Clôturer la saison du département « ${dept.name} » de force. Action irréversible.`,
            requiresComment: true,
            commentLabel: 'Raison de la clôture (obligatoire)',
            confirmLabel: 'Clôturer',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.interventionLoading.set('close');
        this.interventionError.set(null);
        try {
          await this.saService.forceCloseSaison(dept.id, saison.id, result.comment);
        } catch (err: any) {
          this.interventionError.set(err?.message ?? 'Erreur lors de la clôture.');
        } finally {
          this.interventionLoading.set(null);
        }
      });
  }

  openExcludeDialog(member: UserProfile): void {
    const d = this.detail();
    if (!d) return;
    const deptId = d.dept.id;

    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: `Exclure ${member.displayName}`,
            message: `Exclure ce membre du département. Action irréversible.`,
            requiresComment: true,
            commentLabel: "Raison de l'exclusion (obligatoire)",
            confirmLabel: 'Exclure',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.interventionLoading.set('exclude');
        this.interventionError.set(null);
        try {
          await this.saService.excludeMember(deptId, member.uid, result.comment);
        } catch (err: any) {
          this.interventionError.set(err?.message ?? "Erreur lors de l'exclusion.");
        } finally {
          this.interventionLoading.set(null);
        }
      });
  }
}
```

- [ ] **Step 4: Implement the template**

```html
<!-- src/app/features/super-admin/dept-detail/dept-detail.component.html -->
@if (detail() === undefined) {
  <div class="sa-dept-detail-loading">
    <div class="skeleton sa-dept-detail__skeleton-card"></div>
    <div class="skeleton sa-dept-detail__skeleton-card"></div>
    <div class="skeleton sa-dept-detail__skeleton-row"></div>
    <div class="skeleton sa-dept-detail__skeleton-row"></div>
  </div>
} @else if (!detail()) {
  <p class="sa-dept-detail__error">Département introuvable.</p>
} @else {
  @let d = detail()!;

  <div class="sa-dept-detail">
    <a mat-button routerLink="/admin/departments" class="sa-dept-detail__back">
      ← Tous les départements
    </a>

    <mat-card class="sa-dept-detail__card">
      <mat-card-header>
        <mat-card-title>{{ d.dept.name }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Statut :
          <span [class]="'sa-dept-detail__badge sa-dept-detail__badge--' + d.dept.status">
            {{ d.dept.status === 'active' ? 'Actif' : 'En attente' }}
          </span>
        </p>
        <p>Créé le : {{ d.dept.createdAt?.toDate() | date:'d MMMM yyyy' }}</p>
        <p>Admin ID : {{ d.dept.adminId }}</p>
      </mat-card-content>
    </mat-card>

    @if (d.saison) {
      <mat-card class="sa-dept-detail__card">
        <mat-card-header>
          <mat-card-title>Saison active</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Mode : {{ d.saison.mode === 'fixed' ? 'Rotation fixe' : 'Tirage au sort' }}</p>
          <p>Cycle : {{ d.saison.currentCycleIndex + 1 }} / {{ d.saison.totalCycles }}</p>
          <p>Cotisation : {{ d.saison.montantCotisation | number }} FCFA</p>
          <p>Membres : {{ d.members.length }}</p>
        </mat-card-content>
      </mat-card>
    }

    <div class="sa-dept-detail__members">
      <h3 class="sa-dept-detail__section-title">Membres</h3>
      <div class="sa-dept-detail__table-wrapper">
        <table mat-table [dataSource]="d.members" class="sa-dept-detail__table">

          <ng-container matColumnDef="displayName">
            <th mat-header-cell *matHeaderCellDef>Nom</th>
            <td mat-cell *matCellDef="let m">{{ m.displayName }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let m">{{ m.email }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Rôle</th>
            <td mat-cell *matCellDef="let m">{{ m.role }}</td>
          </ng-container>

          <ng-container matColumnDef="rang">
            <th mat-header-cell *matHeaderCellDef>Rang</th>
            <td mat-cell *matCellDef="let m">{{ m.rang }}</td>
          </ng-container>

          <ng-container matColumnDef="hasBenefited">
            <th mat-header-cell *matHeaderCellDef>A bénéficié</th>
            <td mat-cell *matCellDef="let m">{{ m.hasBenefited ? 'Oui' : 'Non' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let m">
              <button
                mat-stroked-button
                color="warn"
                [disabled]="isCurrentBeneficiary(m) || interventionLoading() === 'exclude'"
                [title]="isCurrentBeneficiary(m) ? 'Bénéficiaire du cycle en cours' : ''"
                (click)="openExcludeDialog(m)">
                Exclure
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </div>

    @if (d.saison) {
      <div class="sa-dept-detail__interventions">
        <h3 class="sa-dept-detail__section-title">Interventions exceptionnelles</h3>

        @if (interventionError()) {
          <p class="alert-error">{{ interventionError() }}</p>
        }

        <button
          mat-raised-button
          color="warn"
          [disabled]="interventionLoading() === 'close'"
          (click)="openForceCloseDialog()">
          Clôturer la saison
        </button>
      </div>
    }
  </div>
}
```

- [ ] **Step 5: Implement the styles**

```scss
// src/app/features/super-admin/dept-detail/dept-detail.component.scss
.sa-dept-detail-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sa-dept-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__skeleton-card {
    height: 140px;
    border-radius: var(--radius-lg);
  }

  &__skeleton-row {
    height: 48px;
  }

  &__error {
    color: var(--color-error);
  }

  &__back {
    align-self: flex-start;
  }

  &__card {
    width: 100%;
  }

  &__badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;

    &--active {
      background: color-mix(in srgb, var(--color-success) 15%, transparent);
      color: var(--color-success);
    }

    &--pending {
      background: color-mix(in srgb, var(--color-warning) 15%, transparent);
      color: var(--color-warning);
    }
  }

  &__section-title {
    margin: 0 0 var(--space-2);
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  &__table-wrapper {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
  }

  &__interventions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-error) 5%, transparent);
  }
}
```

- [ ] **Step 6: Run tests**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="dept-detail.component.spec" 2>&1 | tail -15
```

Expected: PASS — 6 tests passing.

- [ ] **Step 7: Run full test suite**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest 2>&1 | tail -20
```

Expected: all suites pass, no regressions.

- [ ] **Step 8: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/super-admin/dept-detail/
git commit -m "feat(super-admin): add DeptDetailComponent with read-only view and exceptional interventions"
```

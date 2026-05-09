# Dashboard & Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard stub at `/app` with three role-based views — MEMBRE, BUREAU, ADMIN — each showing real-time cycle, cotisation, and caisse data from Firestore, with role-appropriate actions.

**Architecture:** `HomeComponent` reads the user's `UserProfile.role` and conditionally renders one of three smart dashboard components (`MembreDashboardComponent`, `BureauDashboardComponent`, `AdminDashboardComponent`). Each smart component subscribes to Firestore via existing services and passes data down to shared "dumb" card components via `@Input()`. No route changes are needed — everything lives at `/app`.

**Tech Stack:** Angular 20 standalone components, Angular Material 20, AngularFire (Firestore real-time + Cloud Functions callable), Angular signals + `toSignal`, Jest + jest-preset-angular (zoneless).

---

## File Structure

**New files — shared card components (dumb, @Input-only):**
- `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.ts`
- `src/app/features/dashboard/shared/progression-card/progression-card.component.ts`
- `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts`
- `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.spec.ts`
- `src/app/features/dashboard/shared/history-card/history-card.component.ts`
- `src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.ts`
- `src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.ts`
- `src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.ts`

**New files — feature components:**
- `src/app/features/membres/invite-dialog/invite-dialog.component.ts`
- `src/app/features/dashboard/membre/membre-dashboard.component.ts`
- `src/app/features/dashboard/bureau/bureau-dashboard.component.ts`
- `src/app/features/dashboard/admin/admin-dashboard.component.ts`

**Modified files:**
- `src/app/core/services/user.service.ts` — add `Functions` inject + `sendInvitation()` + `updateUserRole()`
- `src/app/core/services/user.service.spec.ts` — new, tests for the two new CF-calling methods
- `src/app/features/dashboard/home/home.component.ts` — replace stub with role-switch logic

---

## Task 1: UserService — sendInvitation & updateUserRole

**Files:**
- Modify: `src/app/core/services/user.service.ts`
- Create: `src/app/core/services/user.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/services/user.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { UserService } from './user.service';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  doc: jest.fn(),
  docData: jest.fn(),
  collection: jest.fn(),
  collectionData: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('@angular/fire/functions', () => ({
  ...jest.requireActual('@angular/fire/functions'),
  httpsCallable: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const mockCallable = jest.fn().mockResolvedValue({ data: undefined });

  beforeEach(() => {
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);
    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    service = TestBed.inject(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendInvitation()', () => {
    it('calls sendInvitation CF with correct payload', async () => {
      await service.sendInvitation({ deptId: 'd1', email: 'a@b.com', role: 'membre' });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'sendInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ deptId: 'd1', email: 'a@b.com', role: 'membre' });
    });
  });

  describe('updateUserRole()', () => {
    it('calls updateUserRole CF with correct payload', async () => {
      await service.updateUserRole({ deptId: 'd1', userId: 'u1', newRole: 'bureau' });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateUserRole');
      expect(mockCallable).toHaveBeenCalledWith({ deptId: 'd1', userId: 'u1', newRole: 'bureau' });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/app/core/services/user.service.spec.ts --no-coverage
```

Expected: FAIL — `sendInvitation is not a function`

- [ ] **Step 3: Add Functions inject + two methods to UserService**

Replace the full content of `src/app/core/services/user.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  collection,
  collectionData,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchProfile(deptId: string, uid: string): Observable<UserProfile | undefined> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    return docData(ref) as Observable<UserProfile | undefined>;
  }

  watchAllMembers(deptId: string): Observable<UserProfile[]> {
    const ref = collection(this.firestore, `departments/${deptId}/users`);
    return collectionData(ref, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  async createProfile(
    deptId: string,
    uid: string,
    data: Pick<UserProfile, 'displayName' | 'email' | 'role' | 'rang' | 'mustResetPassword'>
  ): Promise<void> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    await setDoc(ref, {
      ...data,
      hasBenefited: false,
      joinedAt: serverTimestamp(),
    });
  }

  async setMustResetPassword(deptId: string, uid: string, value: boolean): Promise<void> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    await updateDoc(ref, { mustResetPassword: value });
  }

  sendInvitation(payload: { deptId: string; email: string; role: UserRole }): Promise<void> {
    const fn = httpsCallable(this.functions, 'sendInvitation');
    return fn(payload).then(() => undefined);
  }

  updateUserRole(payload: { deptId: string; userId: string; newRole: UserRole }): Promise<void> {
    const fn = httpsCallable(this.functions, 'updateUserRole');
    return fn(payload).then(() => undefined);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/app/core/services/user.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/user.service.ts src/app/core/services/user.service.spec.ts
git commit -m "feat(user): add sendInvitation and updateUserRole CF methods"
```

---

## Task 2: CotisationStatusCardComponent + ProgressionCardComponent

**Files:**
- Create: `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.ts`
- Create: `src/app/features/dashboard/shared/progression-card/progression-card.component.ts`

These are pure `@Input` components with no async logic — no spec needed.

- [ ] **Step 1: Create CotisationStatusCardComponent**

Create `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { CycleStatus, Cotisation } from '../../../../core/models/cycle.model';

@Component({
  selector: 'app-cotisation-status-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Ma cotisation</h3>
        @if (cycleStatus === 'closed') {
          <mat-chip-set><mat-chip>Cycle clôturé</mat-chip></mat-chip-set>
        } @else if (cotisation?.paid) {
          <mat-chip-set><mat-chip color="primary" highlighted>Payé ✅</mat-chip></mat-chip-set>
        } @else {
          <mat-chip-set><mat-chip>En attente ⏳</mat-chip></mat-chip-set>
          <p>Montant dû : {{ montantCotisation | number }} FCFA</p>
          @if (deadline) {
            <p>Échéance : {{ deadline | date:'dd/MM/yyyy' }}</p>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class CotisationStatusCardComponent {
  @Input({ required: true }) cycleStatus!: CycleStatus | null;
  @Input() cotisation: Cotisation | undefined;
  @Input() montantCotisation: number = 0;
  @Input() deadline: Date | null = null;
}
```

- [ ] **Step 2: Create ProgressionCardComponent**

Create `src/app/features/dashboard/shared/progression-card/progression-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progression-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatProgressBar, DecimalPipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Progression collective</h3>
        <p>{{ paidCount }} / {{ totalCount }} membres ont cotisé</p>
        <mat-progress-bar mode="determinate" [value]="progressPct"></mat-progress-bar>
        <p style="margin-top:8px">
          Collecté : {{ paidCount * montantCotisation | number }} /
          {{ totalCount * montantCotisation | number }} FCFA
        </p>
      </mat-card-content>
    </mat-card>
  `,
})
export class ProgressionCardComponent {
  @Input({ required: true }) paidCount!: number;
  @Input({ required: true }) totalCount!: number;
  @Input({ required: true }) montantCotisation!: number;

  get progressPct(): number {
    return this.totalCount ? (this.paidCount / this.totalCount) * 100 : 0;
  }
}
```

- [ ] **Step 3: Run full test suite to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: all existing tests still passing.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/dashboard/shared/
git commit -m "feat(dashboard): add CotisationStatusCard and ProgressionCard components"
```

---

## Task 3: HistoryCardComponent + BeneficiaireCardComponent

**Files:**
- Create: `src/app/features/dashboard/shared/history-card/history-card.component.ts`
- Create: `src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.ts`

- [ ] **Step 1: Create HistoryCardComponent**

Create `src/app/features/dashboard/shared/history-card/history-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-history-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, RouterLink, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Historique récent</h3>
        @if (recentCycles.length === 0) {
          <p>Aucun cycle clôturé.</p>
        } @else {
          @for (c of recentCycles; track c.id) {
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #eee">
              <span>Cycle #{{ c.index }}</span>
              <span>{{ getMemberName(c.beneficiaryUid) }}</span>
              <span>{{ c.montantVerse | number }} FCFA</span>
              <span>{{ c.closedAt?.toDate() | date:'dd/MM/yy' }}</span>
              @if (c.beneficiaryUid === myUid) {
                <mat-chip-set><mat-chip color="accent" highlighted>Bénéficiaire</mat-chip></mat-chip-set>
              }
            </div>
          }
        }
        <a routerLink="/app/cycles/history" style="display:block;margin-top:8px">
          Voir tout l'historique →
        </a>
      </mat-card-content>
    </mat-card>
  `,
})
export class HistoryCardComponent {
  @Input({ required: true }) closedCycles!: Cycle[];
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) myUid!: string;

  get recentCycles(): Cycle[] {
    return [...this.closedCycles].slice(-3).reverse();
  }

  getMemberName(uid: string): string {
    return this.members.find((m) => m.uid === uid)?.displayName ?? uid;
  }
}
```

- [ ] **Step 2: Create BeneficiaireCardComponent**

Create `src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-beneficiaire-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Bénéficiaire du cycle</h3>
        <p><strong>{{ beneficiaryName }}</strong></p>
        <p>Montant : {{ montantEstime | number }} FCFA</p>
        @if (cycle.confirmedAt) {
          <mat-chip-set>
            <mat-chip color="primary" highlighted>
              Confirmé le {{ cycle.confirmedAt.toDate() | date:'dd/MM/yyyy' }}
            </mat-chip>
          </mat-chip-set>
        } @else {
          <mat-chip-set><mat-chip>En attente de confirmation</mat-chip></mat-chip-set>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class BeneficiaireCardComponent {
  @Input({ required: true }) cycle!: Cycle;
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) montantCotisation!: number;

  get beneficiaryName(): string {
    return this.members.find((m) => m.uid === this.cycle.beneficiaryUid)?.displayName
      ?? this.cycle.beneficiaryUid;
  }

  get montantEstime(): number {
    if (this.cycle.status === 'closed') return this.cycle.montantVerse;
    return this.cycle.totalPaid * this.montantCotisation;
  }
}
```

- [ ] **Step 3: Run tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/dashboard/shared/
git commit -m "feat(dashboard): add HistoryCard and BeneficiaireCard components"
```

---

## Task 4: MonRangCardComponent (with spec)

This component has non-trivial conditional CTA logic for the beneficiary, warranting a spec.

**Files:**
- Create: `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts`
- Create: `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { MonRangCardComponent } from './mon-rang-card.component';
import { CycleService } from '../../../../core/services/cycle.service';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { UserProfile } from '../../../../core/models/user.model';
import { Cycle } from '../../../../core/models/cycle.model';

const myProfile: UserProfile = {
  uid: 'u1', displayName: 'Alice', email: 'a@b.com',
  role: 'membre', rang: 1, hasBenefited: false,
  joinedAt: { seconds: 0, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const makeCycle = (overrides: Partial<Cycle>): Cycle => ({
  id: 'c1', index: 1, beneficiaryUid: 'u1',
  deadline: { seconds: 9999999, nanoseconds: 0 } as any,
  status: 'open', closedAt: null, closedBy: null,
  totalPaid: 3, montantVerse: 0, montantCaisse: 0,
  confirmedAt: null, confirmedBy: null,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  ...overrides,
});

describe('MonRangCardComponent — ctaState', () => {
  let component: MonRangCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MonRangCardComponent],
      providers: [
        CycleService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    component = TestBed.createComponent(MonRangCardComponent).componentInstance;
    component.myProfile = myProfile;
    component.memberOrder = ['u1', 'u2', 'u3'];
    component.saisonId = 's1';
    component.deptId = 'd1';
  });

  it('returns "none" when user is not the beneficiary', () => {
    component.cycle = makeCycle({ beneficiaryUid: 'u2' });
    expect(component.ctaState).toBe('none');
  });

  it('returns "disabled" when cycle is open and user is beneficiary', () => {
    component.cycle = makeCycle({ status: 'open', confirmedAt: null });
    expect(component.ctaState).toBe('disabled');
  });

  it('returns "active" when cycle is closed, user is beneficiary, confirmedAt is null', () => {
    component.cycle = makeCycle({
      status: 'closed',
      confirmedAt: null,
      closedAt: { seconds: 1000, nanoseconds: 0 } as any,
      closedBy: 'admin',
    });
    expect(component.ctaState).toBe('active');
  });

  it('returns "confirmed" when confirmedAt is set', () => {
    component.cycle = makeCycle({
      status: 'closed',
      confirmedAt: { seconds: 2000, nanoseconds: 0 } as any,
      confirmedBy: 'u1',
      closedAt: { seconds: 1000, nanoseconds: 0 } as any,
      closedBy: 'admin',
    });
    expect(component.ctaState).toBe('confirmed');
  });

  it('myRank returns 1-based position in memberOrder', () => {
    component.cycle = makeCycle({});
    expect(component.myRank).toBe(1);
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
npx jest src/app/features/dashboard/shared/mon-rang-card --no-coverage
```

Expected: FAIL — `Cannot find module './mon-rang-card.component'`

- [ ] **Step 3: Create MonRangCardComponent**

Create `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts`:

```typescript
import { Component, Input, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';
import { CycleService } from '../../../../core/services/cycle.service';

export type CtaState = 'none' | 'disabled' | 'active' | 'confirmed';

@Component({
  selector: 'app-mon-rang-card',
  standalone: true,
  imports: [
    MatCard, MatCardContent, MatCardActions,
    MatButton, MatChip, MatChipSet, MatTooltip, MatProgressSpinner,
    DecimalPipe,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Mon rang</h3>
        @if (ctaState === 'none') {
          <p>Vous êtes #{{ myRank }} dans la liste des bénéficiaires.</p>
        } @else {
          <p>Vous êtes #{{ myRank }} — <strong>bénéficiaire de ce cycle</strong></p>
          @if (ctaState === 'disabled') {
            <mat-card-actions>
              <button mat-flat-button color="primary" disabled
                [matTooltip]="'En attente de toutes les cotisations'">
                Confirmer la réception
              </button>
            </mat-card-actions>
          } @else if (ctaState === 'active') {
            @if (error()) {
              <p style="color:red">{{ error() }}</p>
            }
            <mat-card-actions>
              @if (loading()) {
                <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
              } @else {
                <button mat-flat-button color="primary" (click)="confirmReception()">
                  Confirmer la réception de {{ cycle?.montantVerse | number }} FCFA
                </button>
              }
            </mat-card-actions>
          } @else if (ctaState === 'confirmed') {
            <mat-chip-set>
              <mat-chip color="primary" highlighted>Réception confirmée ✅</mat-chip>
            </mat-chip-set>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class MonRangCardComponent {
  @Input({ required: true }) myProfile!: UserProfile;
  @Input({ required: true }) memberOrder!: string[];
  @Input({ required: true }) cycle!: Cycle | null;
  @Input({ required: true }) saisonId!: string;
  @Input({ required: true }) deptId!: string;

  private cycleService = inject(CycleService);

  loading = signal(false);
  error = signal<string | null>(null);

  get myRank(): number {
    return this.memberOrder.indexOf(this.myProfile.uid) + 1;
  }

  get isBeneficiary(): boolean {
    return this.cycle?.beneficiaryUid === this.myProfile.uid;
  }

  get ctaState(): CtaState {
    if (!this.isBeneficiary || !this.cycle) return 'none';
    if (this.cycle.confirmedAt !== null) return 'confirmed';
    if (this.cycle.status === 'closed') return 'active';
    return 'disabled';
  }

  async confirmReception(): Promise<void> {
    if (!this.cycle) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.cycleService.confirmReception({
        saisonId: this.saisonId,
        cycleId: this.cycle.id,
      });
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur lors de la confirmation.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Run spec to verify it passes**

```bash
npx jest src/app/features/dashboard/shared/mon-rang-card --no-coverage
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/features/dashboard/shared/mon-rang-card/
git commit -m "feat(dashboard): add MonRangCard with beneficiary CTA logic (tested)"
```

---

## Task 5: CotisationsListCardComponent

BUREAU's main action card — lists all members' cotisation status with mark-paid buttons.

**Files:**
- Create: `src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.ts`

- [ ] **Step 1: Create the component**

Create `src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { Cotisation, CycleStatus } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

interface Row {
  uid: string;
  displayName: string;
  cotisation: Cotisation | undefined;
}

@Component({
  selector: 'app-cotisations-list-card',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton, MatProgressSpinner, MatChip, MatChipSet, DatePipe,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Cotisations — {{ paidCount }} / {{ members.length }} payées</h3>
        <table mat-table [dataSource]="rows" style="width:100%">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Membre</th>
            <td mat-cell *matCellDef="let r">{{ r.displayName }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let r">
              @if (r.cotisation?.paid) {
                <mat-chip-set><mat-chip color="primary" highlighted>Payé ✅</mat-chip></mat-chip-set>
              } @else {
                <mat-chip-set><mat-chip>En attente</mat-chip></mat-chip-set>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              @if (!r.cotisation?.paid && cycleStatus === 'open') {
                @if (markingUid === r.uid) {
                  <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                } @else {
                  <button mat-stroked-button (click)="markPaid.emit(r.uid)">
                    Enregistrer paiement
                  </button>
                }
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  `,
})
export class CotisationsListCardComponent {
  @Input({ required: true }) cotisations!: Cotisation[];
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) cycleStatus!: CycleStatus;
  @Input() markingUid: string | null = null;

  @Output() markPaid = new EventEmitter<string>();

  readonly columns = ['name', 'status', 'action'];

  get rows(): Row[] {
    return this.members.map((m) => ({
      uid: m.uid,
      displayName: m.displayName,
      cotisation: this.cotisations.find((c) => c.uid === m.uid),
    }));
  }

  get paidCount(): number {
    return this.cotisations.filter((c) => c.paid).length;
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/shared/cotisations-list-card/
git commit -m "feat(dashboard): add CotisationsListCard for bureau role"
```

---

## Task 6: CaisseSummaryCardComponent

BUREAU's caisse card — shows balance + last 5 transactions + "Add transaction" button.

**Files:**
- Create: `src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.ts`

- [ ] **Step 1: Create the component**

Create `src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.ts`:

```typescript
import { Component, Input, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CaisseDoc, TransactionDoc } from '../../../../core/models/caisse.model';
import { AddTransactionDialogComponent } from '../../../caisse/caisse/add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse-summary-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Caisse</h3>
        <p style="font-size:1.4rem;font-weight:600">
          {{ caisse?.solde | number }} FCFA
        </p>
        @if (recentTransactions.length > 0) {
          @for (t of recentTransactions; track t.id) {
            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #eee">
              <span>{{ t.libelle || t.categorie }}</span>
              <span [style.color]="t.type === 'credit' ? 'green' : 'red'">
                {{ t.type === 'credit' ? '+' : '-' }}{{ t.montant | number }} FCFA
              </span>
              <span style="color:#999;font-size:.8rem">
                {{ t.createdAt?.toDate() | date:'dd/MM' }}
              </span>
            </div>
          }
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-stroked-button (click)="openAddDialog()">
          Ajouter une transaction
        </button>
      </mat-card-actions>
    </mat-card>
  `,
})
export class CaisseSummaryCardComponent {
  @Input({ required: true }) caisse: CaisseDoc | undefined;
  @Input({ required: true }) transactions!: TransactionDoc[];
  @Input({ required: true }) deptId!: string;

  private dialog = inject(MatDialog);

  get recentTransactions(): TransactionDoc[] {
    return this.transactions.slice(0, 5);
  }

  openAddDialog(): void {
    this.dialog.open(AddTransactionDialogComponent, {
      data: { deptId: this.deptId },
      width: '420px',
    });
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/shared/caisse-summary-card/
git commit -m "feat(dashboard): add CaisseSummaryCard for bureau role"
```

---

## Task 7: InviteDialogComponent

Dialog for ADMIN to invite a new member, choosing their role.

**Files:**
- Create: `src/app/features/membres/invite-dialog/invite-dialog.component.ts`

- [ ] **Step 1: Create the component**

```bash
mkdir -p /home/tilstack/Bureau/tontine-web/src/app/features/membres/invite-dialog
```

Create `src/app/features/membres/invite-dialog/invite-dialog.component.ts`:

```typescript
import { Component, inject, Inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
  MatDialogRef, MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { UserService } from '../../../core/services/user.service';
import { UserRole } from '../../../core/models/user.model';

export interface InviteDialogData {
  deptId: string;
}

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatFormField, MatLabel, MatError,
    MatInput,
    MatSelect, MatOption,
    MatButton,
  ],
  template: `
    <h2 mat-dialog-title>Inviter un membre</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;min-width:320px;padding-top:8px">
        <mat-form-field>
          <mat-label>Adresse e-mail</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="off">
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>L'e-mail est requis</mat-error>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Format d'e-mail invalide</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Rôle</mat-label>
          <mat-select formControlName="role">
            <mat-option value="membre">Membre</mat-option>
            <mat-option value="bureau">Bureau</mat-option>
          </mat-select>
          @if (form.get('role')?.hasError('required') && form.get('role')?.touched) {
            <mat-error>Choisissez un rôle</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p style="color:red;margin:0">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary"
        [disabled]="form.invalid || loading()"
        (click)="submit()">
        {{ loading() ? 'Envoi…' : 'Envoyer l\'invitation' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class InviteDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<InviteDialogComponent>);

  readonly deptId: string;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: [null as UserRole | null, Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) data: InviteDialogData) {
    this.deptId = data.deptId;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.userService.sendInvitation({
        deptId: this.deptId,
        email: this.form.value.email!,
        role: this.form.value.role!,
      });
      this.dialogRef.close(true);
    } catch {
      this.error.set("Erreur lors de l'envoi de l'invitation.");
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/membres/
git commit -m "feat(membres): add InviteDialogComponent"
```

---

## Task 8: MembreDashboardComponent

Smart component — subscribes to all data for the MEMBRE view and composes the shared cards.

**Files:**
- Create: `src/app/features/dashboard/membre/membre-dashboard.component.ts`

- [ ] **Step 1: Create the component**

```bash
mkdir -p /home/tilstack/Bureau/tontine-web/src/app/features/dashboard/membre
```

Create `src/app/features/dashboard/membre/membre-dashboard.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CotisationStatusCardComponent } from '../shared/cotisation-status-card/cotisation-status-card.component';
import { ProgressionCardComponent } from '../shared/progression-card/progression-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';

@Component({
  selector: 'app-membre-dashboard',
  standalone: true,
  imports: [
    MatProgressSpinner,
    CotisationStatusCardComponent,
    ProgressionCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  template: `
    @if (!ctx()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else {
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px">
        <app-cotisation-status-card
          [cycleStatus]="ctx()!.cycleData?.cycle?.status ?? null"
          [cotisation]="myCotisation()"
          [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0"
          [deadline]="ctx()!.cycleData?.cycle?.deadline?.toDate() ?? null">
        </app-cotisation-status-card>

        @if (ctx()!.cycleData) {
          <app-progression-card
            [paidCount]="paidCount()"
            [totalCount]="ctx()!.members.length"
            [montantCotisation]="ctx()!.saison!.montantCotisation">
          </app-progression-card>
        }

        @if (ctx()!.saison && ctx()!.cycleData) {
          <app-mon-rang-card
            [myProfile]="ctx()!.myProfile!"
            [memberOrder]="ctx()!.saison!.memberOrder"
            [cycle]="ctx()!.cycleData!.cycle"
            [saisonId]="ctx()!.saison!.id"
            [deptId]="ctx()!.deptId">
          </app-mon-rang-card>
        }

        <app-history-card
          [closedCycles]="ctx()!.closedCycles"
          [members]="ctx()!.members"
          [myUid]="ctx()!.uid">
        </app-history-card>
      </div>
    }
  `,
})
export class MembreDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        this.userService.watchProfile(deptId, uid),
      ]).pipe(
        switchMap(([saison, members, myProfile]) => {
          if (!saison) {
            return of({ deptId, uid, saison: null, cycleData: null, closedCycles: [], members, myProfile });
          }
          return combineLatest([
            this.cycleService.watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex),
            this.cycleService.watchClosedCycles(deptId, saison.id),
          ]).pipe(
            map(([cycleData, closedCycles]) => ({ deptId, uid, saison, cycleData, closedCycles, members, myProfile }))
          );
        })
      );
    })
  );

  ctx = toSignal(this.context$);

  myCotisation() {
    const uid = this.ctx()?.uid;
    return this.ctx()?.cycleData?.cotisations.find((c) => c.uid === uid);
  }

  paidCount() {
    return this.ctx()?.cycleData?.cotisations.filter((c) => c.paid).length ?? 0;
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/membre/
git commit -m "feat(dashboard): add MembreDashboardComponent"
```

---

## Task 9: BureauDashboardComponent

Smart component for BUREAU — extends MEMBRE view with cotisations management and caisse.

**Files:**
- Create: `src/app/features/dashboard/bureau/bureau-dashboard.component.ts`

- [ ] **Step 1: Create the component**

```bash
mkdir -p /home/tilstack/Bureau/tontine-web/src/app/features/dashboard/bureau
```

Create `src/app/features/dashboard/bureau/bureau-dashboard.component.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { CotisationsListCardComponent } from '../shared/cotisations-list-card/cotisations-list-card.component';
import { CaisseSummaryCardComponent } from '../shared/caisse-summary-card/caisse-summary-card.component';
import { BeneficiaireCardComponent } from '../shared/beneficiaire-card/beneficiaire-card.component';
import { CotisationStatusCardComponent } from '../shared/cotisation-status-card/cotisation-status-card.component';
import { ProgressionCardComponent } from '../shared/progression-card/progression-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';

@Component({
  selector: 'app-bureau-dashboard',
  standalone: true,
  imports: [
    MatProgressSpinner,
    CotisationsListCardComponent,
    CaisseSummaryCardComponent,
    BeneficiaireCardComponent,
    CotisationStatusCardComponent,
    ProgressionCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  template: `
    @if (!ctx()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else {
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px">

        @if (ctx()!.cycleData) {
          <app-cotisations-list-card
            [cotisations]="ctx()!.cycleData!.cotisations"
            [members]="ctx()!.members"
            [cycleStatus]="ctx()!.cycleData!.cycle.status"
            [markingUid]="markingUid()"
            (markPaid)="onMarkPaid($event)">
          </app-cotisations-list-card>
        }

        <app-caisse-summary-card
          [caisse]="ctx()!.caisse"
          [transactions]="ctx()!.transactions"
          [deptId]="ctx()!.deptId">
        </app-caisse-summary-card>

        @if (ctx()!.cycleData) {
          <app-beneficiaire-card
            [cycle]="ctx()!.cycleData!.cycle"
            [members]="ctx()!.members"
            [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0">
          </app-beneficiaire-card>
        }

        <app-cotisation-status-card
          [cycleStatus]="ctx()!.cycleData?.cycle?.status ?? null"
          [cotisation]="myCotisation()"
          [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0"
          [deadline]="ctx()!.cycleData?.cycle?.deadline?.toDate() ?? null">
        </app-cotisation-status-card>

        @if (ctx()!.saison && ctx()!.cycleData) {
          <app-mon-rang-card
            [myProfile]="ctx()!.myProfile!"
            [memberOrder]="ctx()!.saison!.memberOrder"
            [cycle]="ctx()!.cycleData!.cycle"
            [saisonId]="ctx()!.saison!.id"
            [deptId]="ctx()!.deptId">
          </app-mon-rang-card>
        }

        <app-history-card
          [closedCycles]="ctx()!.closedCycles"
          [members]="ctx()!.members"
          [myUid]="ctx()!.uid">
        </app-history-card>

      </div>
    }
  `,
})
export class BureauDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private caisseService = inject(CaisseService);

  markingUid = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        this.userService.watchProfile(deptId, uid),
        this.caisseService.watchCaisse(deptId),
        this.caisseService.watchTransactions(deptId),
      ]).pipe(
        switchMap(([saison, members, myProfile, caisse, transactions]) => {
          if (!saison) {
            return of({ deptId, uid, saison: null, cycleData: null, closedCycles: [], members, myProfile, caisse, transactions });
          }
          return combineLatest([
            this.cycleService.watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex),
            this.cycleService.watchClosedCycles(deptId, saison.id),
          ]).pipe(
            map(([cycleData, closedCycles]) => ({
              deptId, uid, saison, cycleData, closedCycles, members, myProfile, caisse, transactions,
            }))
          );
        })
      );
    })
  );

  ctx = toSignal(this.context$);

  myCotisation() {
    const uid = this.ctx()?.uid;
    return this.ctx()?.cycleData?.cotisations.find((c) => c.uid === uid);
  }

  async onMarkPaid(uid: string): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.deptId || !ctx.saison || !ctx.cycleData) return;
    this.markingUid.set(uid);
    try {
      await this.cycleService.markCotisationPaid({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
        userId: uid,
      });
    } finally {
      this.markingUid.set(null);
    }
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/bureau/
git commit -m "feat(dashboard): add BureauDashboardComponent"
```

---

## Task 10: AdminDashboardComponent

Smart component for ADMIN — extends bureau view with cycle lifecycle, saison alert, and member management.

**Files:**
- Create: `src/app/features/dashboard/admin/admin-dashboard.component.ts`

- [ ] **Step 1: Create the component**

```bash
mkdir -p /home/tilstack/Bureau/tontine-web/src/app/features/dashboard/admin
```

Create `src/app/features/dashboard/admin/admin-dashboard.component.ts`:

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { CotisationsListCardComponent } from '../shared/cotisations-list-card/cotisations-list-card.component';
import { CaisseSummaryCardComponent } from '../shared/caisse-summary-card/caisse-summary-card.component';
import { BeneficiaireCardComponent } from '../shared/beneficiaire-card/beneficiaire-card.component';
import { CotisationStatusCardComponent } from '../shared/cotisation-status-card/cotisation-status-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';
import { InviteDialogComponent } from '../../membres/invite-dialog/invite-dialog.component';
import { UserProfile, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatProgressSpinner,
    MatButton, MatCard, MatCardContent, MatCardActions, MatTooltip,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    CotisationsListCardComponent, CaisseSummaryCardComponent, BeneficiaireCardComponent,
    CotisationStatusCardComponent, MonRangCardComponent, HistoryCardComponent,
  ],
  template: `
    @if (!ctx()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else {
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px">

        <!-- Bloc 0 — Alerte saison -->
        @if (!ctx()!.saison) {
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;display:flex;align-items:center;justify-content:space-between">
            <span>⚠️ Aucune saison en cours — Configurez une nouvelle saison pour démarrer.</span>
            <a routerLink="/app/cycles/setup">
              <button mat-flat-button color="accent">Créer une saison</button>
            </a>
          </div>
        }

        <!-- Bloc 1 — Actions cycle -->
        @if (ctx()!.cycleData) {
          <mat-card>
            <mat-card-content>
              <h3>Cycle #{{ ctx()!.cycleData!.cycle.index }} —
                {{ ctx()!.cycleData!.cycle.status === 'open' ? 'Ouvert' : 'Clôturé' }}</h3>
              @if (cycleError()) {
                <p style="color:red">{{ cycleError() }}</p>
              }
            </mat-card-content>
            <mat-card-actions>
              @if (ctx()!.cycleData!.cycle.status === 'open') {
                @if (cycleLoading()) {
                  <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
                } @else if (deadlinePassed()) {
                  <button mat-flat-button color="warn" (click)="onForceClose()">
                    Forcer la clôture
                  </button>
                } @else {
                  <button mat-flat-button color="primary" disabled
                    matTooltip="En attente de la confirmation du bénéficiaire">
                    Clôturer le cycle
                  </button>
                }
              } @else {
                @if (cycleLoading()) {
                  <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
                } @else if (canOpenNext()) {
                  <button mat-flat-button color="primary" (click)="onOpenNext()">
                    Ouvrir le cycle suivant
                  </button>
                } @else if (ctx()!.saison?.status === 'completed') {
                  <a routerLink="/app/cycles/setup">
                    <button mat-stroked-button>Configurer une nouvelle saison</button>
                  </a>
                }
              }
            </mat-card-actions>
          </mat-card>
        }

        <!-- Bloc 2 — Membres -->
        <mat-card>
          <mat-card-content>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>Membres ({{ ctx()!.members.length }})</h3>
              <button mat-stroked-button (click)="openInviteDialog()">
                Inviter un membre
              </button>
            </div>
            @if (roleError()) {
              <p style="color:red">{{ roleError() }}</p>
            }
            <table mat-table [dataSource]="ctx()!.members" style="width:100%">
              <ng-container matColumnDef="name">
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
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let m">
                  @if (m.role === 'membre') {
                    <button mat-stroked-button [disabled]="roleUpdatingUid() === m.uid"
                      (click)="updateRole(m, 'bureau')">
                      Promouvoir en Bureau
                    </button>
                  } @else if (m.role === 'bureau') {
                    <button mat-stroked-button [disabled]="roleUpdatingUid() === m.uid"
                      (click)="updateRole(m, 'membre')">
                      Rétrograder en Membre
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="memberColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: memberColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Bloc 3 — Cotisations + Caisse (réutilise cartes Bureau) -->
        @if (ctx()!.cycleData) {
          <app-cotisations-list-card
            [cotisations]="ctx()!.cycleData!.cotisations"
            [members]="ctx()!.members"
            [cycleStatus]="ctx()!.cycleData!.cycle.status"
            [markingUid]="markingUid()"
            (markPaid)="onMarkPaid($event)">
          </app-cotisations-list-card>
        }

        <app-caisse-summary-card
          [caisse]="ctx()!.caisse"
          [transactions]="ctx()!.transactions"
          [deptId]="ctx()!.deptId">
        </app-caisse-summary-card>

        <!-- Bloc 4 — Mes infos -->
        @if (ctx()!.cycleData) {
          <app-beneficiaire-card
            [cycle]="ctx()!.cycleData!.cycle"
            [members]="ctx()!.members"
            [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0">
          </app-beneficiaire-card>
        }

        @if (ctx()!.saison && ctx()!.cycleData) {
          <app-mon-rang-card
            [myProfile]="ctx()!.myProfile!"
            [memberOrder]="ctx()!.saison!.memberOrder"
            [cycle]="ctx()!.cycleData!.cycle"
            [saisonId]="ctx()!.saison!.id"
            [deptId]="ctx()!.deptId">
          </app-mon-rang-card>
        }

        <app-history-card
          [closedCycles]="ctx()!.closedCycles"
          [members]="ctx()!.members"
          [myUid]="ctx()!.uid">
        </app-history-card>

      </div>
    }
  `,
})
export class AdminDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private caisseService = inject(CaisseService);
  private dialog = inject(MatDialog);

  readonly memberColumns = ['name', 'email', 'role', 'action'];

  markingUid = signal<string | null>(null);
  cycleLoading = signal(false);
  cycleError = signal<string | null>(null);
  roleUpdatingUid = signal<string | null>(null);
  roleError = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        this.userService.watchProfile(deptId, uid),
        this.caisseService.watchCaisse(deptId),
        this.caisseService.watchTransactions(deptId),
      ]).pipe(
        switchMap(([saison, members, myProfile, caisse, transactions]) => {
          if (!saison) {
            return of({ deptId, uid, saison: null, cycleData: null, closedCycles: [], members, myProfile, caisse, transactions });
          }
          return combineLatest([
            this.cycleService.watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex),
            this.cycleService.watchClosedCycles(deptId, saison.id),
          ]).pipe(
            map(([cycleData, closedCycles]) => ({
              deptId, uid, saison, cycleData, closedCycles, members, myProfile, caisse, transactions,
            }))
          );
        })
      );
    })
  );

  ctx = toSignal(this.context$);

  deadlinePassed = computed(() => {
    const cycle = this.ctx()?.cycleData?.cycle;
    return cycle ? cycle.deadline.toDate() < new Date() : false;
  });

  canOpenNext = computed(() => {
    const cycle = this.ctx()?.cycleData?.cycle;
    return cycle?.status === 'closed';
  });

  async onMarkPaid(uid: string): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.markingUid.set(uid);
    try {
      await this.cycleService.markCotisationPaid({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
        userId: uid,
      });
    } finally {
      this.markingUid.set(null);
    }
  }

  async onForceClose(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.cycleLoading.set(true);
    this.cycleError.set(null);
    try {
      await this.cycleService.forceCloseCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.cycleError.set(err?.message ?? 'Erreur lors de la clôture.');
    } finally {
      this.cycleLoading.set(false);
    }
  }

  async onOpenNext(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.cycleLoading.set(true);
    this.cycleError.set(null);
    try {
      await this.cycleService.openNextCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.cycleError.set(err?.message ?? "Erreur lors de l'ouverture.");
    } finally {
      this.cycleLoading.set(false);
    }
  }

  async updateRole(member: UserProfile, newRole: UserRole): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.deptId) return;
    this.roleUpdatingUid.set(member.uid);
    this.roleError.set(null);
    try {
      await this.userService.updateUserRole({
        deptId: ctx.deptId,
        userId: member.uid,
        newRole,
      });
    } catch (err: any) {
      this.roleError.set(err?.message ?? 'Erreur lors du changement de rôle.');
    } finally {
      this.roleUpdatingUid.set(null);
    }
  }

  openInviteDialog(): void {
    const deptId = this.ctx()?.deptId;
    if (!deptId) return;
    this.dialog.open(InviteDialogComponent, {
      data: { deptId },
      width: '420px',
    });
  }
}
```

- [ ] **Step 2: Run tests**

```bash
npx jest --no-coverage
```

Expected: all passing.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/admin/
git commit -m "feat(dashboard): add AdminDashboardComponent"
```

---

## Task 11: HomeComponent — role-based routing

Replace the stub with a component that detects the user's role and renders the appropriate dashboard.

**Files:**
- Modify: `src/app/features/dashboard/home/home.component.ts`

- [ ] **Step 1: Replace the stub**

Overwrite `src/app/features/dashboard/home/home.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { MembreDashboardComponent } from '../membre/membre-dashboard.component';
import { BureauDashboardComponent } from '../bureau/bureau-dashboard.component';
import { AdminDashboardComponent } from '../admin/admin-dashboard.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatProgressSpinner,
    MembreDashboardComponent,
    BureauDashboardComponent,
    AdminDashboardComponent,
  ],
  template: `
    @if (!profile()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else if (profile()!.role === 'admin') {
      <app-admin-dashboard></app-admin-dashboard>
    } @else if (profile()!.role === 'bureau') {
      <app-bureau-dashboard></app-bureau-dashboard>
    } @else {
      <app-membre-dashboard></app-membre-dashboard>
    }
  `,
})
export class HomeComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);

  private profile$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(undefined);
      return this.userService.watchProfile(claims.deptId, this.auth.currentUser!.uid);
    })
  );

  profile = toSignal(this.profile$);
}
```

- [ ] **Step 2: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all existing tests passing (HomeComponent has no spec, that's fine).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/dashboard/home/home.component.ts
git commit -m "feat(dashboard): replace stub — HomeComponent routes to role-based dashboard"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ MEMBRE Bloc 1 — CotisationStatusCard shows paid/pending/closed states
- ✅ MEMBRE Bloc 2 — ProgressionCard with count + bar + amounts
- ✅ MEMBRE Bloc 3 — MonRangCard with 4 CTA states (none/disabled/active/confirmed)
- ✅ MEMBRE Bloc 4 — HistoryCard with 3 most recent cycles + beneficiary badge
- ✅ BUREAU Bloc 1 — CotisationsListCard with markPaid button
- ✅ BUREAU Bloc 2 — CaisseSummaryCard reuses AddTransactionDialogComponent
- ✅ BUREAU Bloc 3 — BeneficiaireCard with montantEstime logic
- ✅ BUREAU Bloc 4 — reuses MEMBRE cards via @Input (no duplication)
- ✅ ADMIN Bloc 0 — saison alert banner with /app/cycles/setup link
- ✅ ADMIN Bloc 1 — cycle lifecycle: deadlinePassed → force close; closed → open next; saison completed → setup link
- ✅ ADMIN Bloc 2 — member list with promote/demote buttons + invite dialog
- ✅ ADMIN Bloc 3/4 — reuses BUREAU and MEMBRE cards
- ✅ InviteDialogComponent with email + role fields
- ✅ UserService.sendInvitation + updateUserRole (tested)
- ✅ HomeComponent role-switch

**Type consistency:**
- `CycleService.markCotisationPaid` → `{ saisonId, cycleId, userId }` ✅ (matches service definition)
- `CycleService.forceCloseCycle` → `{ saisonId, cycleId }` ✅
- `CycleService.openNextCycle` → `{ saisonId, cycleId }` ✅
- `CycleService.confirmReception` → `{ saisonId, cycleId }` ✅
- `UserService.sendInvitation` → `{ deptId, email, role: UserRole }` ✅
- `UserService.updateUserRole` → `{ deptId, userId, newRole: UserRole }` ✅
- `Cycle.confirmedAt: Timestamp | null` — compared to `null` throughout ✅
- `Saison.memberOrder: string[]` — used in MonRangCard for rank ✅

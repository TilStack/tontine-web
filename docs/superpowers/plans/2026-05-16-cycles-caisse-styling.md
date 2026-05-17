# Cycles + Caisse — Styling Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply design system (BEM + CSS tokens) to 7 components across `/app/cycles` and `/app/caisse`, eliminating all inline styles, replacing `| number` with `FcfaPipe`, adding skeleton loaders, and wiring `ConfirmDialogComponent` for the force-close action.

**Architecture:** Each component gets an external SCSS file (`styleUrl`), BEM class names scoped to the component, and CSS-only responsive layout. No Material chip components — replaced with BEM badge spans using global utility classes. The `ConfirmDialogComponent` is opened programmatically via `MatDialog.open()` (not in `imports[]`).

**Tech Stack:** Angular 18 standalone, Angular Material v20, Jest + jest-preset-angular (zoneless), `FcfaPipe` (`src/app/core/pipes/fcfa.pipe.ts`), `ConfirmDialogComponent` (`src/app/shared/components/confirm-dialog/`), SCSS mixins at `app/core/styles/mixins`, global utilities in `_utilities.scss`.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `src/app/features/cycles/cycle-active/cycle-active.component.ts` |
| Modify | `src/app/features/cycles/cycle-active/cycle-active.component.html` |
| **Create** | `src/app/features/cycles/cycle-active/cycle-active.component.scss` |
| **Create** | `src/app/features/cycles/cycle-active/cycle-active.component.spec.ts` |
| Modify | `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.ts` |
| Modify | `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.html` |
| **Create** | `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.scss` |
| **Create** | `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.spec.ts` |
| Modify | `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.ts` |
| Modify | `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.html` |
| **Create** | `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.scss` |
| **Create** | `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.spec.ts` |
| Modify | `src/app/features/cycles/cycle-history/cycle-history.component.ts` |
| Modify | `src/app/features/cycles/cycle-history/cycle-history.component.html` |
| **Create** | `src/app/features/cycles/cycle-history/cycle-history.component.scss` |
| **Create** | `src/app/features/cycles/cycle-history/cycle-history.component.spec.ts` |
| Modify | `src/app/features/cycles/saison-setup/saison-setup.component.ts` |
| Modify | `src/app/features/cycles/saison-setup/saison-setup.component.html` |
| **Create** | `src/app/features/cycles/saison-setup/saison-setup.component.scss` |
| **Create** | `src/app/features/cycles/saison-setup/saison-setup.component.spec.ts` |
| Modify | `src/app/features/caisse/caisse/caisse.component.ts` |
| Modify | `src/app/features/caisse/caisse/caisse.component.html` |
| **Create** | `src/app/features/caisse/caisse/caisse.component.scss` |
| Update | `src/app/features/caisse/caisse/caisse.component.spec.ts` |
| Modify | `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.ts` |
| Modify | `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.html` |
| **Create** | `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.scss` |

---

## Task 1: CycleActiveComponent

**Files:**
- Modify: `src/app/features/cycles/cycle-active/cycle-active.component.ts`
- Modify: `src/app/features/cycles/cycle-active/cycle-active.component.html`
- Create: `src/app/features/cycles/cycle-active/cycle-active.component.scss`
- Create: `src/app/features/cycles/cycle-active/cycle-active.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// src/app/features/cycles/cycle-active/cycle-active.component.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CycleActiveComponent } from './cycle-active.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('CycleActiveComponent', () => {
  it('shows skeleton (.cycle-active-loading) when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [CycleActiveComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleActiveComponent> = TestBed.createComponent(CycleActiveComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.cycle-active-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.cycle-active-content')).toBeNull();
  });

  it('shows content (.cycle-active-content) when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [CycleActiveComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getClaims: () => Promise.resolve({ deptId: 'd1' }),
            currentUser: { uid: 'u1' },
          },
        },
        {
          provide: UserService,
          useValue: {
            watchAllMembers: () => of([]),
            watchProfile: () => of(null),
          },
        },
        { provide: SaisonService, useValue: { watchActiveSaison: () => of(null) } },
        { provide: CycleService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleActiveComponent> = TestBed.createComponent(CycleActiveComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.cycle-active-content')).toBeTruthy();
    expect(f.nativeElement.querySelector('.cycle-active-loading')).toBeNull();
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cycle-active.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `.cycle-active-loading` not found (template still has `<mat-spinner />`).

- [ ] **Step 3: Update cycle-active.component.ts**

Full replacement of the file:

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, map, combineLatest } from 'rxjs';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
  MatCardActions,
  MatCardSubtitle,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { FcfaPipe } from '../../../core/pipes/fcfa.pipe';
import { CotisationChecklistComponent } from './cotisation-checklist/cotisation-checklist.component';
import { BeneficiaryConfirmComponent } from './beneficiary-confirm/beneficiary-confirm.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-cycle-active',
  standalone: true,
  imports: [
    MatButton,
    MatProgressSpinner,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardActions,
    RouterLink,
    DatePipe,
    FcfaPipe,
    CotisationChecklistComponent,
    BeneficiaryConfirmComponent,
  ],
  templateUrl: './cycle-active.component.html',
  styleUrl: './cycle-active.component.scss',
})
export class CycleActiveComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private dialog = inject(MatDialog);

  markingUid = signal<string | null>(null);
  actionLoading = signal(false);
  actionError = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        from(this.auth.getClaims()).pipe(
          switchMap((c) =>
            c?.deptId && this.auth.currentUser?.uid
              ? this.userService.watchProfile(c.deptId, this.auth.currentUser.uid)
              : of(undefined),
          ),
        ),
      ]).pipe(
        switchMap(([saison, members, myProfile]) => {
          if (!saison) {
            return of({ deptId, saison: null, cycleData: null, members, myProfile });
          }
          return this.cycleService
            .watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex)
            .pipe(map((cycleData) => ({ deptId, saison, cycleData, members, myProfile })));
        }),
      );
    }),
  );

  ctx = toSignal(this.context$);

  canMarkPaid = computed(() => {
    const role = this.ctx()?.myProfile?.role;
    return role === 'admin' || role === 'bureau';
  });

  canForceClose = computed(() => {
    const ctx = this.ctx();
    if (ctx?.myProfile?.role !== 'admin') return false;
    const cycle = ctx?.cycleData?.cycle;
    if (!cycle || cycle.status !== 'open') return false;
    return cycle.deadline.toDate() < new Date();
  });

  canOpenNext = computed(() => {
    const ctx = this.ctx();
    if (ctx?.myProfile?.role !== 'admin') return false;
    const cycle = ctx?.cycleData?.cycle;
    return cycle?.status === 'closed' && cycle.confirmedAt !== null;
  });

  showBeneficiaryConfirm = computed(() => {
    const ctx = this.ctx();
    const cycle = ctx?.cycleData?.cycle;
    const uid = this.auth.currentUser?.uid;
    return (
      cycle?.status === 'closed' &&
      uid === cycle.beneficiaryUid &&
      cycle.confirmedAt === null
    );
  });

  confirmForceClose(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Forcer la clôture du cycle',
        message: "Êtes-vous sûr ? Les membres n'ayant pas payé seront pénalisés.",
        confirmLabel: 'Forcer la clôture',
        confirmColor: 'error',
      } satisfies ConfirmDialogData,
      width: '420px',
    }).afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) this.onForceClose();
    });
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
    } catch (err: any) {
      this.actionError.set(err?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      this.markingUid.set(null);
    }
  }

  async onForceClose(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    try {
      await this.cycleService.forceCloseCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.actionError.set(err?.message ?? 'Erreur lors de la clôture.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  async onOpenNext(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    try {
      await this.cycleService.openNextCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.actionError.set(err?.message ?? "Erreur lors de l'ouverture du cycle.");
    } finally {
      this.actionLoading.set(false);
    }
  }

  getMemberName(uid: string): string {
    return (
      this.ctx()?.members?.find((m: UserProfile) => m.uid === uid)?.displayName ?? uid
    );
  }
}
```

- [ ] **Step 4: Update cycle-active.component.html**

```html
@if (!ctx()) {
  <div class="cycle-active-loading">
    <div class="skeleton cycle-active__skeleton-title"></div>
    <div class="skeleton cycle-active__skeleton-card"></div>
  </div>
} @else if (!ctx()!.saison) {
  <div class="cycle-active-content">
    <mat-card>
      <mat-card-content>
        <p>Aucune saison en cours.</p>
        @if (ctx()!.myProfile?.role === "admin") {
          <a mat-raised-button color="primary" routerLink="/app/cycles/setup">
            Créer une nouvelle saison
          </a>
        }
      </mat-card-content>
    </mat-card>
  </div>
} @else {
  <div class="cycle-active-content">
    @let saison = ctx()!.saison!;
    @let cycleData = ctx()!.cycleData;

    <h2 class="cycle-active__title">
      Saison en cours —
      {{ saison.mode === "lottery" ? "Tirage au sort" : "Rotation fixe" }}
    </h2>

    @if (!cycleData) {
      <div class="cycle-active__inner-skeleton">
        <div class="skeleton cycle-active__skeleton-line"></div>
        <div class="skeleton cycle-active__skeleton-line cycle-active__skeleton-line--short"></div>
        <div class="skeleton cycle-active__skeleton-line"></div>
      </div>
    } @else {
      @let cycle = cycleData.cycle;

      <mat-card class="cycle-active__card">
        <mat-card-header>
          <mat-card-title>
            Cycle {{ cycle.index }} / {{ saison.totalCycles }}
          </mat-card-title>
          <mat-card-subtitle>
            Bénéficiaire : {{ getMemberName(cycle.beneficiaryUid) }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Deadline : {{ cycle.deadline.toDate() | date: "d MMMM yyyy" }}</p>
          <p>
            Cotisations : {{ cycle.totalPaid }} /
            {{ saison.totalCycles }} membres
          </p>
          <p>Montant versé : {{ cycle.montantVerse | fcfa }}</p>

          <div class="cycle-active__badges">
            <span
              [class.badge-success]="cycle.status === 'open'"
              [class.badge-neutral]="cycle.status !== 'open'"
            >
              {{ cycle.status === "open" ? "Ouvert" : "Fermé" }}
            </span>
            @if (cycle.status === "closed" && cycle.closedBy) {
              <span class="badge-neutral">Clôturé par {{ cycle.closedBy }}</span>
            }
            @if (cycle.confirmedAt) {
              <span class="badge-success">Réception confirmée</span>
            }
          </div>
        </mat-card-content>

        <mat-card-actions>
          @if (actionError()) {
            <p class="alert-error">{{ actionError() }}</p>
          }

          @if (canForceClose()) {
            <button
              mat-stroked-button
              color="warn"
              [disabled]="actionLoading()"
              (click)="confirmForceClose()"
            >
              Forcer la clôture
            </button>
          }

          @if (canOpenNext()) {
            <button
              mat-raised-button
              color="primary"
              [disabled]="actionLoading()"
              (click)="onOpenNext()"
            >
              Ouvrir le cycle suivant
            </button>
          }

          @if (ctx()!.myProfile?.role === "admin") {
            <a mat-button routerLink="/app/cycles/setup">Nouvelle saison</a>
          }
        </mat-card-actions>
      </mat-card>

      @if (showBeneficiaryConfirm()) {
        <app-beneficiary-confirm
          [saisonId]="saison.id"
          [cycleId]="cycle.id"
          [montantVerse]="cycle.montantVerse"
        />
      }

      <app-cotisation-checklist
        [cotisations]="cycleData.cotisations"
        [members]="ctx()!.members"
        [canMarkPaid]="canMarkPaid()"
        [markingUid]="markingUid()"
        (markPaid)="onMarkPaid($event)"
      />
    }
  </div>
}
```

- [ ] **Step 5: Create cycle-active.component.scss**

```scss
@use 'app/core/styles/mixins' as m;

.cycle-active-loading {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.cycle-active__skeleton-title {
  height: 28px;
  width: 50%;
  max-width: 320px;
}

.cycle-active__skeleton-card {
  height: 220px;
  border-radius: var(--radius-lg);
}

.cycle-active__inner-skeleton {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.cycle-active__skeleton-line {
  height: 20px;
  width: 100%;

  &--short {
    width: 60%;
  }
}

.cycle-active-content {
  padding: var(--space-4);
  max-width: 800px;
  margin: 0 auto;
}

.cycle-active__title {
  margin-bottom: var(--space-4);
}

.cycle-active__card {
  margin-bottom: var(--space-4);
}

.cycle-active__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
```

- [ ] **Step 6: Run spec to verify it passes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cycle-active.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 2 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/cycles/cycle-active/cycle-active.component.ts \
        src/app/features/cycles/cycle-active/cycle-active.component.html \
        src/app/features/cycles/cycle-active/cycle-active.component.scss \
        src/app/features/cycles/cycle-active/cycle-active.component.spec.ts
git commit -m "style(cycles): CycleActiveComponent — BEM SCSS, FcfaPipe, ConfirmDialog, skeleton"
```

---

## Task 2: CotisationChecklistComponent

**Files:**
- Modify: `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.ts`
- Modify: `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.html`
- Create: `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.scss`
- Create: `src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// src/app/features/cycles/cycle-active/cotisation-checklist/cotisation-checklist.component.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationChecklistComponent } from './cotisation-checklist.component';

describe('CotisationChecklistComponent', () => {
  function setup(members: any[], cotisations: any[], canMarkPaid = false) {
    TestBed.configureTestingModule({
      imports: [CotisationChecklistComponent, NoopAnimationsModule],
    });
    const f: ComponentFixture<CotisationChecklistComponent> =
      TestBed.createComponent(CotisationChecklistComponent);
    f.componentInstance.members = members;
    f.componentInstance.cotisations = cotisations;
    f.componentInstance.canMarkPaid = canMarkPaid;
    f.detectChanges();
    return f;
  }

  it('renders one list item per member', () => {
    const f = setup(
      [
        { uid: 'u1', displayName: 'Alice' },
        { uid: 'u2', displayName: 'Bob' },
      ],
      [{ uid: 'u1', paid: true, penalized: false }],
    );
    expect(f.nativeElement.querySelectorAll('mat-list-item').length).toBe(2);
  });

  it('applies .checklist__icon--paid on paid member icon', () => {
    const f = setup(
      [{ uid: 'u1', displayName: 'Alice' }],
      [{ uid: 'u1', paid: true, penalized: false }],
    );
    expect(f.nativeElement.querySelector('.checklist__icon--paid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.checklist__icon--unpaid')).toBeNull();
  });

  it('applies .checklist__icon--unpaid on unpaid member icon', () => {
    const f = setup(
      [{ uid: 'u1', displayName: 'Alice' }],
      [{ uid: 'u1', paid: false, penalized: false }],
    );
    expect(f.nativeElement.querySelector('.checklist__icon--unpaid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.checklist__icon--paid')).toBeNull();
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cotisation-checklist.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `.checklist__icon--paid` not found (still uses `[style.color]`).

- [ ] **Step 3: Update cotisation-checklist.component.ts — add styleUrl**

Add `styleUrl: './cotisation-checklist.component.scss',` after `templateUrl`:

```typescript
@Component({
  selector: 'app-cotisation-checklist',
  standalone: true,
  imports: [MatList, MatListItem, MatIconButton, MatIcon, MatProgressSpinner],
  templateUrl: './cotisation-checklist.component.html',
  styleUrl: './cotisation-checklist.component.scss',
})
```

- [ ] **Step 4: Update cotisation-checklist.component.html**

Replace `[style.color]="cot?.paid ? 'green' : 'red'"` with BEM modifier bindings:

```html
<mat-list class="checklist">
  @for (member of members; track member.uid) {
    @let cot = getCotisation(member.uid);
    <mat-list-item>
      <mat-icon
        matListItemIcon
        [class.checklist__icon--paid]="cot?.paid"
        [class.checklist__icon--unpaid]="!cot?.paid"
      >
        {{ cot?.paid ? 'check_circle' : 'cancel' }}
      </mat-icon>
      <span matListItemTitle>{{ member.displayName }}</span>
      <span matListItemLine>
        @if (cot?.paid) {
          Payé
        } @else if (cot?.penalized) {
          Pénalisé
        } @else {
          En attente
        }
      </span>

      @if (canMarkPaid && !cot?.paid && member.uid !== null) {
        <button
          matListItemMeta
          mat-icon-button
          color="primary"
          [disabled]="markingUid === member.uid"
          (click)="onMarkPaid(member.uid)"
          aria-label="Marquer payé"
        >
          @if (markingUid === member.uid) {
            <mat-spinner diameter="20" />
          } @else {
            <mat-icon>add_task</mat-icon>
          }
        </button>
      }
    </mat-list-item>
  }
</mat-list>
```

- [ ] **Step 5: Create cotisation-checklist.component.scss**

```scss
.checklist {
  &__icon--paid {
    color: var(--color-success);
  }

  &__icon--unpaid {
    color: var(--color-error);
  }
}
```

- [ ] **Step 6: Run spec to verify it passes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cotisation-checklist.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 3 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/cycles/cycle-active/cotisation-checklist/
git commit -m "style(cycles): CotisationChecklistComponent — BEM SCSS, replace inline color"
```

---

## Task 3: BeneficiaryConfirmComponent

**Files:**
- Modify: `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.ts`
- Modify: `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.html`
- Create: `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.scss`
- Create: `src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// src/app/features/cycles/cycle-active/beneficiary-confirm/beneficiary-confirm.component.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BeneficiaryConfirmComponent } from './beneficiary-confirm.component';
import { CycleService } from '../../../../core/services/cycle.service';

describe('BeneficiaryConfirmComponent', () => {
  function setup(cycleSvcOverride: Partial<CycleService> = {}) {
    TestBed.configureTestingModule({
      imports: [BeneficiaryConfirmComponent, NoopAnimationsModule],
      providers: [
        {
          provide: CycleService,
          useValue: {
            confirmReception: jest.fn().mockResolvedValue(undefined),
            ...cycleSvcOverride,
          },
        },
      ],
    });
    const f: ComponentFixture<BeneficiaryConfirmComponent> =
      TestBed.createComponent(BeneficiaryConfirmComponent);
    f.componentInstance.saisonId = 's1';
    f.componentInstance.cycleId = 'c1';
    f.componentInstance.montantVerse = 75000;
    f.detectChanges();
    return f;
  }

  it('displays montantVerse via FcfaPipe (contains FCFA)', () => {
    const f = setup();
    expect(f.nativeElement.textContent).toContain('FCFA');
    expect(f.nativeElement.textContent).toContain('75');
  });

  it('shows .alert-error class after failed confirm()', async () => {
    const f = setup({
      confirmReception: jest.fn().mockRejectedValue(new Error('Erreur test')),
    });
    await f.componentInstance.confirm();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="beneficiary-confirm.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `class="error"` not `.alert-error`, `| number` not FcfaPipe.

- [ ] **Step 3: Update beneficiary-confirm.component.ts**

Replace `DecimalPipe` with `FcfaPipe`, add `styleUrl`:

```typescript
import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions,
} from '@angular/material/card';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { CycleService } from '../../../../core/services/cycle.service';

@Component({
  selector: 'app-beneficiary-confirm',
  standalone: true,
  imports: [
    MatButton, MatProgressSpinner,
    MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions,
    FcfaPipe,
  ],
  templateUrl: './beneficiary-confirm.component.html',
  styleUrl: './beneficiary-confirm.component.scss',
})
export class BeneficiaryConfirmComponent {
  @Input({ required: true }) saisonId!: string;
  @Input({ required: true }) cycleId!: string;
  @Input({ required: true }) montantVerse!: number;

  @Output() confirmed = new EventEmitter<void>();

  private cycleService = inject(CycleService);

  loading = signal(false);
  error = signal<string | null>(null);

  async confirm(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.cycleService.confirmReception({
        saisonId: this.saisonId,
        cycleId: this.cycleId,
      });
      this.confirmed.emit();
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur lors de la confirmation.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Update beneficiary-confirm.component.html**

```html
<mat-card class="beneficiary-confirm">
  <mat-card-header>
    <mat-card-title>Vous êtes le bénéficiaire de ce cycle</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <p>Montant reçu : <strong>{{ montantVerse | fcfa }}</strong></p>
    <p>Confirmez la réception pour permettre l'ouverture du prochain cycle.</p>
    @if (error()) {
      <p class="alert-error">{{ error() }}</p>
    }
  </mat-card-content>
  <mat-card-actions>
    <button
      mat-raised-button
      color="primary"
      [disabled]="loading()"
      (click)="confirm()"
    >
      @if (loading()) {
        <mat-spinner diameter="20" />
      } @else {
        Confirmer la réception
      }
    </button>
  </mat-card-actions>
</mat-card>
```

- [ ] **Step 5: Create beneficiary-confirm.component.scss**

```scss
.beneficiary-confirm {
  margin-top: var(--space-4);
  border-left: 3px solid var(--color-accent);
}
```

- [ ] **Step 6: Run spec to verify it passes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="beneficiary-confirm.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 2 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/cycles/cycle-active/beneficiary-confirm/
git commit -m "style(cycles): BeneficiaryConfirmComponent — FcfaPipe, alert-error, BEM SCSS"
```

---

## Task 4: CycleHistoryComponent

**Files:**
- Modify: `src/app/features/cycles/cycle-history/cycle-history.component.ts`
- Modify: `src/app/features/cycles/cycle-history/cycle-history.component.html`
- Create: `src/app/features/cycles/cycle-history/cycle-history.component.scss`
- Create: `src/app/features/cycles/cycle-history/cycle-history.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// src/app/features/cycles/cycle-history/cycle-history.component.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CycleHistoryComponent } from './cycle-history.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('CycleHistoryComponent', () => {
  it('shows skeleton (.history-loading) when data is pending', () => {
    TestBed.configureTestingModule({
      imports: [CycleHistoryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleHistoryComponent> = TestBed.createComponent(CycleHistoryComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.history-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.history-content')).toBeNull();
  });

  it('shows content (.history-content) when data resolves', async () => {
    TestBed.configureTestingModule({
      imports: [CycleHistoryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getClaims: () => Promise.resolve({ deptId: 'd1' }),
            currentUser: { uid: 'u1' },
          },
        },
        { provide: UserService, useValue: { watchAllMembers: () => of([]) } },
        { provide: SaisonService, useValue: { watchActiveSaison: () => of(null) } },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleHistoryComponent> = TestBed.createComponent(CycleHistoryComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.history-content')).toBeTruthy();
    expect(f.nativeElement.querySelector('.history-loading')).toBeNull();
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cycle-history.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL.

- [ ] **Step 3: Update cycle-history.component.ts**

Replace `DecimalPipe` with `FcfaPipe`, add `styleUrl`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { DatePipe } from '@angular/common';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FcfaPipe } from '../../../core/pipes/fcfa.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-cycle-history',
  standalone: true,
  imports: [
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatIcon, MatCard, MatCardContent,
    DatePipe, FcfaPipe,
  ],
  templateUrl: './cycle-history.component.html',
  styleUrl: './cycle-history.component.scss',
})
export class CycleHistoryComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);

  displayedColumns = ['index', 'beneficiary', 'montantVerse', 'montantCaisse', 'closedAt', 'confirmed'];

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
      ]).pipe(
        switchMap(([saison, members]) => {
          if (!saison) return of({ cycles: [], members });
          return this.cycleService.watchClosedCycles(deptId, saison.id).pipe(
            map((cycles) => ({ cycles, members }))
          );
        })
      );
    })
  );

  data = toSignal(this.data$);

  getMemberName(uid: string): string {
    return this.data()?.members?.find((m: UserProfile) => m.uid === uid)?.displayName ?? uid;
  }
}
```

- [ ] **Step 4: Update cycle-history.component.html**

```html
@if (!data()) {
  <div class="history-loading">
    <div class="skeleton history__skeleton-title"></div>
    <div class="skeleton history__skeleton-row"></div>
    <div class="skeleton history__skeleton-row"></div>
    <div class="skeleton history__skeleton-row"></div>
  </div>
} @else {
  <div class="history-content">
    <h2 class="history__title">Historique des cycles</h2>

    @if (!data()!.cycles.length) {
      <mat-card>
        <mat-card-content>
          <p>Aucun cycle terminé pour cette saison.</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <!-- Desktop table -->
      <div class="history__table-wrapper">
        <table mat-table [dataSource]="data()!.cycles" class="history__table">

          <ng-container matColumnDef="index">
            <th mat-header-cell *matHeaderCellDef>Cycle</th>
            <td mat-cell *matCellDef="let cycle">{{ cycle.index }}</td>
          </ng-container>

          <ng-container matColumnDef="beneficiary">
            <th mat-header-cell *matHeaderCellDef>Bénéficiaire</th>
            <td mat-cell *matCellDef="let cycle">{{ getMemberName(cycle.beneficiaryUid) }}</td>
          </ng-container>

          <ng-container matColumnDef="montantVerse">
            <th mat-header-cell *matHeaderCellDef>Montant versé</th>
            <td mat-cell *matCellDef="let cycle">{{ cycle.montantVerse | fcfa }}</td>
          </ng-container>

          <ng-container matColumnDef="montantCaisse">
            <th mat-header-cell *matHeaderCellDef>Caisse</th>
            <td mat-cell *matCellDef="let cycle">{{ cycle.montantCaisse | fcfa }}</td>
          </ng-container>

          <ng-container matColumnDef="closedAt">
            <th mat-header-cell *matHeaderCellDef>Clôturé le</th>
            <td mat-cell *matCellDef="let cycle">
              {{ cycle.closedAt?.toDate() | date:'d MMM yyyy' }}
              <small>({{ cycle.closedBy }})</small>
            </td>
          </ng-container>

          <ng-container matColumnDef="confirmed">
            <th mat-header-cell *matHeaderCellDef>Confirmé</th>
            <td mat-cell *matCellDef="let cycle">
              <mat-icon [class.history__icon--confirmed]="cycle.confirmedAt"
                        [class.history__icon--pending]="!cycle.confirmedAt">
                {{ cycle.confirmedAt ? 'check_circle' : 'pending' }}
              </mat-icon>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="history__mobile-list">
        @for (cycle of data()!.cycles; track cycle.id) {
          <div class="history__mobile-card card">
            <div class="history__mobile-row">
              <span class="history__mobile-label">Cycle</span>
              <span>{{ cycle.index }}</span>
            </div>
            <div class="history__mobile-row">
              <span class="history__mobile-label">Bénéficiaire</span>
              <span>{{ getMemberName(cycle.beneficiaryUid) }}</span>
            </div>
            <div class="history__mobile-row">
              <span class="history__mobile-label">Montant versé</span>
              <span class="text-fcfa">{{ cycle.montantVerse | fcfa }}</span>
            </div>
            <div class="history__mobile-row">
              <span class="history__mobile-label">Caisse</span>
              <span class="text-fcfa">{{ cycle.montantCaisse | fcfa }}</span>
            </div>
            <div class="history__mobile-row">
              <span class="history__mobile-label">Clôturé le</span>
              <span>{{ cycle.closedAt?.toDate() | date:'d MMM yyyy' }}</span>
            </div>
            <div class="history__mobile-row">
              <span class="history__mobile-label">Confirmé</span>
              <mat-icon [class.history__icon--confirmed]="cycle.confirmedAt"
                        [class.history__icon--pending]="!cycle.confirmedAt">
                {{ cycle.confirmedAt ? 'check_circle' : 'pending' }}
              </mat-icon>
            </div>
          </div>
        }
      </div>
    }
  </div>
}
```

- [ ] **Step 5: Create cycle-history.component.scss**

```scss
@use 'app/core/styles/mixins' as m;

.history-loading {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.history__skeleton-title {
  height: 28px;
  width: 40%;
  max-width: 240px;
}

.history__skeleton-row {
  height: 48px;
}

.history-content {
  padding: var(--space-4);
}

.history__title {
  margin-bottom: var(--space-4);
}

.history__icon--confirmed {
  color: var(--color-success);
}

.history__icon--pending {
  color: var(--color-warning);
}

/* Desktop table — hidden on mobile, shown on desktop */
.history__table-wrapper {
  display: none;

  @include m.desktop {
    display: block;
  }
}

.history__table {
  width: 100%;
}

/* Mobile cards — shown on mobile, hidden on desktop */
.history__mobile-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);

  @include m.desktop {
    display: none;
  }
}

.history__mobile-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history__mobile-row {
  @include m.flex-between;
  font-size: var(--font-size-sm);
}

.history__mobile-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}
```

- [ ] **Step 6: Run spec to verify it passes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="cycle-history.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 2 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/cycles/cycle-history/
git commit -m "style(cycles): CycleHistoryComponent — skeleton, FcfaPipe, BEM SCSS, mobile responsive"
```

---

## Task 5: SaisonSetupComponent

**Files:**
- Modify: `src/app/features/cycles/saison-setup/saison-setup.component.ts`
- Modify: `src/app/features/cycles/saison-setup/saison-setup.component.html`
- Create: `src/app/features/cycles/saison-setup/saison-setup.component.scss`
- Create: `src/app/features/cycles/saison-setup/saison-setup.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

```typescript
// src/app/features/cycles/saison-setup/saison-setup.component.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { SaisonSetupComponent } from './saison-setup.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';

describe('SaisonSetupComponent', () => {
  function setup(members: any[]) {
    TestBed.configureTestingModule({
      imports: [SaisonSetupComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { getClaims: () => Promise.resolve({ deptId: 'd1' }) },
        },
        {
          provide: UserService,
          useValue: { watchAllMembers: () => of(members) },
        },
        { provide: SaisonService, useValue: { createSaison: jest.fn().mockResolvedValue(undefined) } },
      ],
    });
    const f: ComponentFixture<SaisonSetupComponent> = TestBed.createComponent(SaisonSetupComponent);
    return f;
  }

  it('shows minimum-members message when department has fewer than 2 members', async () => {
    const f = setup([]);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('au moins 2 membres');
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows form when department has 2 or more members', async () => {
    const f = setup([
      { uid: 'u1', displayName: 'Alice', joinedAt: { seconds: 1 } },
      { uid: 'u2', displayName: 'Bob', joinedAt: { seconds: 2 } },
    ]);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeTruthy();
    expect(f.nativeElement.textContent).not.toContain('au moins 2 membres');
  });

  it('shows .alert-error class on submit error', async () => {
    const errorSaisonSvc = {
      createSaison: jest.fn().mockRejectedValue(new Error('Quota dépassé')),
    };
    TestBed.configureTestingModule({
      imports: [SaisonSetupComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { getClaims: () => Promise.resolve({ deptId: 'd1' }) },
        },
        {
          provide: UserService,
          useValue: {
            watchAllMembers: () => of([
              { uid: 'u1', displayName: 'Alice', joinedAt: { seconds: 1 } },
              { uid: 'u2', displayName: 'Bob', joinedAt: { seconds: 2 } },
            ]),
          },
        },
        { provide: SaisonService, useValue: errorSaisonSvc },
      ],
    });
    const f: ComponentFixture<SaisonSetupComponent> = TestBed.createComponent(SaisonSetupComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    await f.componentInstance.submit();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run spec to verify it fails**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="saison-setup.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `.alert-error` not found (template uses `class="error"`).

- [ ] **Step 3: Update saison-setup.component.ts — add styleUrl**

```typescript
@Component({
  selector: 'app-saison-setup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DragDropModule,
    MatFormField, MatLabel, MatInput, MatButton,
    MatSelect, MatOption, MatProgressSpinner, MatIcon,
    MatList, MatListItem,
  ],
  templateUrl: './saison-setup.component.html',
  styleUrl: './saison-setup.component.scss',
})
```

- [ ] **Step 4: Update saison-setup.component.html**

Replace `class="error"` with `class="alert-error"` (line 48):

```html
<div class="setup-container">
  <h2 class="setup__title">Créer une nouvelle saison</h2>

  @if (seniorMembers().length < 2) {
    <p class="setup__min-members">Le département doit avoir au moins 2 membres pour créer une saison.</p>
  } @else {
    <form [formGroup]="form" (ngSubmit)="submit()" class="setup__form">

      <mat-form-field appearance="outline" class="setup__field">
        <mat-label>Mode d'ordre</mat-label>
        <mat-select formControlName="mode">
          <mat-option value="lottery">Tirage au sort (rangs 3+ aléatoires)</mat-option>
          <mat-option value="fixed">Rotation fixe (défini manuellement)</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="setup__field">
        <mat-label>Montant de cotisation (FCFA)</mat-label>
        <input matInput type="number" formControlName="montantCotisation" />
      </mat-form-field>

      <h3>Rangs 1 et 2 — Membres les plus anciens (immuables)</h3>
      <mat-list>
        @for (member of seniorMembers(); track member.uid; let i = $index) {
          <mat-list-item>
            <mat-icon matListItemIcon>lock</mat-icon>
            <span matListItemTitle>Rang {{ i + 1 }} — {{ member.displayName }}</span>
          </mat-list-item>
        }
      </mat-list>

      @if (mode() === 'fixed' && reorderableMembers().length > 0) {
        <h3>Rangs 3+ — Glissez pour réordonner</h3>
        <div cdkDropList (cdkDropListDropped)="drop($event)" class="setup__drop-list">
          @for (member of reorderableMembers(); track member.uid; let i = $index) {
            <div class="drag-item" cdkDrag>
              <mat-icon>drag_indicator</mat-icon>
              Rang {{ i + 3 }} — {{ member.displayName }}
            </div>
          }
        </div>
      }

      @if (mode() === 'lottery' && reorderableMembers().length > 0) {
        <p class="setup__lottery-note">Les rangs 3+ seront déterminés par tirage au sort côté serveur.</p>
      }

      @if (error()) {
        <p class="alert-error">{{ error() }}</p>
      }

      <button
        mat-raised-button
        color="primary"
        type="submit"
        class="setup__submit"
        [disabled]="form.invalid || loading()"
      >
        @if (loading()) {
          <mat-spinner diameter="20" />
        } @else {
          Créer la saison
        }
      </button>

    </form>
  }
</div>
```

- [ ] **Step 5: Create saison-setup.component.scss**

```scss
@use 'app/core/styles/mixins' as m;

.setup-container {
  padding: var(--space-4);
  max-width: 560px;
  margin: 0 auto;
}

.setup__title {
  margin-bottom: var(--space-4);
}

.setup__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.setup__field {
  width: 100%;
}

.setup__drop-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.drag-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: grab;
  font-size: var(--font-size-sm);
  transition: box-shadow var(--transition-fast);

  &:active {
    cursor: grabbing;
    box-shadow: var(--shadow-md);
  }
}

.setup__lottery-note {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.setup__submit {
  align-self: flex-start;
}
```

- [ ] **Step 6: Run spec to verify it passes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="saison-setup.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 3 tests passing.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/cycles/saison-setup/
git commit -m "style(cycles): SaisonSetupComponent — BEM SCSS, drag-item, alert-error"
```

---

## Task 6: CaisseComponent

**Files:**
- Modify: `src/app/features/caisse/caisse/caisse.component.ts`
- Modify: `src/app/features/caisse/caisse/caisse.component.html`
- Create: `src/app/features/caisse/caisse/caisse.component.scss`
- Update: `src/app/features/caisse/caisse/caisse.component.spec.ts`

- [ ] **Step 1: Update caisse.component.spec.ts — add skeleton test**

Add one new test at the top of the existing describe block. The existing 5 tests must remain unchanged. Insert before the `beforeEach`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, of } from 'rxjs';
import { CaisseComponent } from './caisse.component';
import { CaisseService } from '../../../core/services/caisse.service';
import { AuthService } from '../../../core/services/auth.service';
import { CaisseDoc, TransactionDoc } from '../../../core/models/caisse.model';

const mockCaisse: CaisseDoc = {
  solde: 15000,
  totalEntrees: 15000,
  totalSorties: 0,
  updatedAt: { seconds: 1000, nanoseconds: 0 } as any,
};

const mockTx: TransactionDoc = {
  id: 'tx-1',
  montant: 5000,
  type: 'debit',
  categorie: 'nourriture',
  libelle: 'Repas annuel',
  source: 'manuel',
  cycleId: null,
  createdBy: 'uid-1',
  createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
};

describe('CaisseComponent', () => {
  it('shows skeleton (.caisse-loading) when data is pending', () => {
    TestBed.configureTestingModule({
      imports: [CaisseComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: { getClaims: () => NEVER } },
        { provide: CaisseService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(CaisseComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.caisse-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.caisse-container')).toBeNull();
  });

  describe('loaded state', () => {
    let component: CaisseComponent;
    let fixture: ComponentFixture<CaisseComponent>;
    let authMock: { getClaims: jest.Mock };
    let caisseMock: { watchCaisse: jest.Mock; watchTransactions: jest.Mock };
    let dialogMock: { open: jest.Mock };

    const createComponent = async (transactions: TransactionDoc[] = []) => {
      caisseMock.watchTransactions.mockReturnValue(of(transactions));
      fixture = TestBed.createComponent(CaisseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    beforeEach(async () => {
      authMock = { getClaims: jest.fn().mockResolvedValue({ deptId: 'dept-1' }) };
      caisseMock = {
        watchCaisse: jest.fn().mockReturnValue(of(mockCaisse)),
        watchTransactions: jest.fn().mockReturnValue(of([])),
      };
      dialogMock = { open: jest.fn() };

      await TestBed.configureTestingModule({
        imports: [CaisseComponent, NoopAnimationsModule],
        providers: [
          { provide: AuthService, useValue: authMock },
          { provide: CaisseService, useValue: caisseMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('should be created', async () => {
      await createComponent();
      expect(component).toBeTruthy();
    });

    it('should display solde from caisse doc', async () => {
      await createComponent();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('15');
    });

    it('should show empty state when no transactions', async () => {
      await createComponent([]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Aucune dépense enregistrée');
    });

    it('should show transaction row when transactions exist', async () => {
      await createComponent([mockTx]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Nourriture');
    });

    it('openAddDialog() should open AddTransactionDialogComponent', async () => {
      await createComponent();
      component.openAddDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run spec to verify skeleton test fails, existing tests pass**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="caisse.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: skeleton test FAILS (template has `<mat-spinner />`), 5 existing tests PASS.

- [ ] **Step 3: Update caisse.component.ts**

Replace `DecimalPipe` with `FcfaPipe`, add `styleUrl`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { FcfaPipe } from '../../../core/pipes/fcfa.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { AddTransactionDialogComponent } from './add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatButton,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatIcon,
    DatePipe, FcfaPipe,
  ],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.scss',
})
export class CaisseComponent {
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  private dialog = inject(MatDialog);

  displayedColumns = ['date', 'categorie', 'libelle', 'montant'];

  private readonly categorieLabels: Record<string, string> = {
    nourriture: 'Nourriture',
    sortie: 'Sortie',
    evenement: 'Événement',
    materiel: 'Matériel',
    autre: 'Autre',
  };

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      return combineLatest([
        this.caisseService.watchCaisse(deptId),
        this.caisseService.watchTransactions(deptId),
      ]).pipe(map(([caisse, transactions]) => ({ deptId, caisse, transactions })));
    })
  );

  data = toSignal(this.data$);

  openAddDialog(): void {
    const deptId = this.data()?.deptId;
    if (!deptId) return;
    this.dialog.open(AddTransactionDialogComponent, {
      data: { deptId },
      width: '420px',
    });
  }

  getCategorieLabel(cat: string): string {
    return this.categorieLabels[cat] ?? cat;
  }
}
```

- [ ] **Step 4: Update caisse.component.html**

Remove ALL `style=""` attributes, use `| fcfa`, add skeleton:

```html
@if (data() === undefined) {
  <div class="caisse-loading">
    <div class="skeleton caisse__skeleton-card"></div>
    <div class="skeleton caisse__skeleton-btn"></div>
    <div class="skeleton caisse__skeleton-row"></div>
    <div class="skeleton caisse__skeleton-row"></div>
  </div>
} @else if (data() === null) {
  <p class="caisse__error-msg">Impossible de charger la caisse.</p>
} @else {
  <div class="caisse-container">
    <mat-card class="caisse__summary-card">
      <mat-card-content>
        <p class="caisse__summary-label">Solde actuel</p>
        <p class="caisse__summary-solde">
          {{ data()!.caisse?.solde ?? 0 | fcfa }}
        </p>
        <p class="caisse__summary-meta">
          Entrées : {{ data()!.caisse?.totalEntrees ?? 0 | fcfa }}
          &nbsp;|&nbsp;
          Sorties : {{ data()!.caisse?.totalSorties ?? 0 | fcfa }}
        </p>
      </mat-card-content>
    </mat-card>

    <div class="caisse__actions">
      <button mat-raised-button color="primary" (click)="openAddDialog()">
        <mat-icon>add</mat-icon>
        Ajouter une dépense
      </button>
    </div>

    @if (!data()!.transactions.length) {
      <mat-card>
        <mat-card-content>
          <p class="caisse__empty-msg">Aucune dépense enregistrée pour l'instant.</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="caisse__table-wrapper">
        <table mat-table [dataSource]="data()!.transactions" class="caisse__table">

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>Date</th>
            <td mat-cell *matCellDef="let tx">
              {{ tx.createdAt?.toDate() | date:'d MMM yyyy' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="categorie">
            <th mat-header-cell *matHeaderCellDef>Catégorie</th>
            <td mat-cell *matCellDef="let tx">{{ getCategorieLabel(tx.categorie) }}</td>
          </ng-container>

          <ng-container matColumnDef="libelle">
            <th mat-header-cell *matHeaderCellDef>Libellé</th>
            <td mat-cell *matCellDef="let tx">{{ tx.libelle || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="montant">
            <th mat-header-cell *matHeaderCellDef>Montant</th>
            <td mat-cell *matCellDef="let tx" class="caisse__montant-cell">
              −{{ tx.montant | fcfa }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    }
  </div>
}
```

- [ ] **Step 5: Create caisse.component.scss**

```scss
@use 'app/core/styles/mixins' as m;

.caisse-loading {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.caisse__skeleton-card {
  height: 120px;
  border-radius: var(--radius-lg);
}

.caisse__skeleton-btn {
  height: 40px;
  width: 200px;
  border-radius: var(--radius-md);
}

.caisse__skeleton-row {
  height: 48px;
}

.caisse-container {
  padding: var(--space-4);
}

.caisse__summary-card {
  margin-bottom: var(--space-4);
}

.caisse__summary-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-1);
}

.caisse__summary-solde {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-2);
}

.caisse__summary-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.caisse__actions {
  margin-bottom: var(--space-3);
}

.caisse__empty-msg {
  margin: 0;
  color: var(--color-text-secondary);
}

.caisse__error-msg {
  padding: var(--space-4);
  color: var(--color-error);
}

.caisse__table-wrapper {
  overflow-x: auto;
}

.caisse__table {
  width: 100%;
}

.caisse__montant-cell {
  color: var(--color-error);
  font-weight: 500;
}
```

- [ ] **Step 6: Run all caisse specs**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="caisse.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 6 tests passing (1 skeleton + 5 existing).

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/caisse/caisse/caisse.component.ts \
        src/app/features/caisse/caisse/caisse.component.html \
        src/app/features/caisse/caisse/caisse.component.scss \
        src/app/features/caisse/caisse/caisse.component.spec.ts
git commit -m "style(caisse): CaisseComponent — remove inline styles, FcfaPipe, skeleton, BEM SCSS"
```

---

## Task 7: AddTransactionDialogComponent

**Files:**
- Modify: `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.ts`
- Modify: `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.html`
- Create: `src/app/features/caisse/caisse/add-transaction-dialog/add-transaction-dialog.component.scss`

- [ ] **Step 1: Run existing spec to confirm it passes before changes**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="add-transaction-dialog.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 4 tests passing.

- [ ] **Step 2: Update add-transaction-dialog.component.ts — add styleUrl**

```typescript
@Component({
  selector: 'app-add-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatFormField, MatLabel, MatError, MatInput,
    MatSelect, MatOption, MatButton,
  ],
  templateUrl: './add-transaction-dialog.component.html',
  styleUrl: './add-transaction-dialog.component.scss',
})
```

- [ ] **Step 3: Update add-transaction-dialog.component.html**

Remove all `style=""` attributes, replace inline error style with `alert-error`:

```html
<h2 mat-dialog-title>Ajouter une dépense</h2>

<mat-dialog-content>
  <form [formGroup]="form" class="add-tx__form">
    <mat-form-field appearance="outline" class="add-tx__field">
      <mat-label>Montant (FCFA)</mat-label>
      <input matInput type="number" formControlName="montant" min="1" />
      @if (form.get('montant')?.hasError('required') && form.get('montant')?.touched) {
        <mat-error>Le montant est requis.</mat-error>
      }
      @if (form.get('montant')?.hasError('min') && form.get('montant')?.touched) {
        <mat-error>Le montant doit être supérieur à 0.</mat-error>
      }
    </mat-form-field>

    <mat-form-field appearance="outline" class="add-tx__field">
      <mat-label>Catégorie</mat-label>
      <mat-select formControlName="categorie">
        @for (cat of categories; track cat.value) {
          <mat-option [value]="cat.value">{{ cat.label }}</mat-option>
        }
      </mat-select>
      @if (form.get('categorie')?.hasError('required') && form.get('categorie')?.touched) {
        <mat-error>La catégorie est requise.</mat-error>
      }
    </mat-form-field>

    <mat-form-field appearance="outline" class="add-tx__field">
      <mat-label>Libellé (optionnel)</mat-label>
      <input matInput formControlName="libelle" maxlength="200" />
    </mat-form-field>

    @if (error()) {
      <p class="alert-error">{{ error() }}</p>
    }
  </form>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Annuler</button>
  <button
    mat-raised-button
    color="primary"
    [disabled]="form.invalid || loading()"
    (click)="submit()"
  >
    {{ loading() ? 'Enregistrement…' : 'Enregistrer' }}
  </button>
</mat-dialog-actions>
```

- [ ] **Step 4: Create add-transaction-dialog.component.scss**

```scss
.add-tx__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.add-tx__field {
  width: 100%;
}
```

- [ ] **Step 5: Run spec to verify existing tests still pass**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --testPathPattern="add-transaction-dialog.component.spec" --no-coverage 2>&1 | tail -20
```

Expected: PASS — 4 tests passing.

- [ ] **Step 6: Run full test suite**

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --no-coverage 2>&1 | tail -30
```

Expected: All tests pass with 0 failures.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web
git add src/app/features/caisse/caisse/add-transaction-dialog/
git commit -m "style(caisse): AddTransactionDialogComponent — remove inline styles, alert-error, BEM SCSS"
```

---

## Final: Run full suite

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --no-coverage 2>&1 | tail -30
```

All tests must pass before finishing the branch.

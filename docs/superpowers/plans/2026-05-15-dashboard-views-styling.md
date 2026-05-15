# Dashboard Views — Styling Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract inline templates to `.html`/`.scss` for 10 existing components, apply the Design System (BEM, tokens, FcfaPipe, skeleton loaders), and create a reusable `ConfirmDialogComponent`.

**Architecture:** Each component moves from inline `template:` to external `templateUrl:` + `styleUrl:`. Skeleton loading is page-level (`@if (!ctx())`) — shared cards remain pure display components. `ConfirmDialogComponent` is a new generic shared component. Zero inline `style=""` attributes, zero `| number` for monetary values, zero hardcoded colors.

**Tech Stack:** Angular 18 standalone, Jest (zoneless, `jest-preset-angular`), Angular Material (MatCard, MatDialog, MatTable, MatProgressBar, MatIcon, MatIconButton, MatButton). SCSS via `@use 'app/core/styles/mixins' as m`. FcfaPipe, DatePipe. `@if`/`@for` control flow.

---

## File Structure

**New files:**
```
src/app/shared/components/confirm-dialog/
  confirm-dialog.component.ts
  confirm-dialog.component.html
  confirm-dialog.component.scss
  confirm-dialog.component.spec.ts

src/app/features/dashboard/membre/
  membre-dashboard.component.html
  membre-dashboard.component.scss
  membre-dashboard.component.spec.ts

src/app/features/dashboard/bureau/
  bureau-dashboard.component.html
  bureau-dashboard.component.scss
  bureau-dashboard.component.spec.ts

src/app/features/dashboard/admin/
  admin-dashboard.component.html
  admin-dashboard.component.scss
  admin-dashboard.component.spec.ts

src/app/features/dashboard/shared/cotisation-status-card/
  cotisation-status-card.component.html
  cotisation-status-card.component.scss
  cotisation-status-card.component.spec.ts

src/app/features/dashboard/shared/progression-card/
  progression-card.component.html
  progression-card.component.scss
  progression-card.component.spec.ts

src/app/features/dashboard/shared/mon-rang-card/
  mon-rang-card.component.html
  mon-rang-card.component.scss
  (spec already exists — verify still passes)

src/app/features/dashboard/shared/beneficiaire-card/
  beneficiaire-card.component.html
  beneficiaire-card.component.scss
  beneficiaire-card.component.spec.ts

src/app/features/dashboard/shared/cotisations-list-card/
  cotisations-list-card.component.html
  cotisations-list-card.component.scss
  cotisations-list-card.component.spec.ts

src/app/features/dashboard/shared/caisse-summary-card/
  caisse-summary-card.component.html
  caisse-summary-card.component.scss
  caisse-summary-card.component.spec.ts

src/app/features/dashboard/shared/history-card/
  history-card.component.html
  history-card.component.scss
  history-card.component.spec.ts
```

**Modified files:**
```
src/app/core/styles/_utilities.scss
src/app/features/dashboard/membre/membre-dashboard.component.ts
src/app/features/dashboard/bureau/bureau-dashboard.component.ts
src/app/features/dashboard/admin/admin-dashboard.component.ts
src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.ts
src/app/features/dashboard/shared/progression-card/progression-card.component.ts
src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts
src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.ts
src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.ts
src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.ts
src/app/features/dashboard/shared/history-card/history-card.component.ts
```

---

## Task 1: Global utilities (`_utilities.scss`)

**Files:**
- Modify: `src/app/core/styles/_utilities.scss`

- [ ] **Step 1: Add skeleton shimmer + badge-neutral + btn-primary--auto modifier**

Open `src/app/core/styles/_utilities.scss`. Add the following at the end of the file (after the `.alert-success` block):

```scss
/* ─── Skeleton loader ─────────────────────────────────────────────────────── */
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    color-mix(in srgb, var(--color-border) 40%, transparent) 50%,
    var(--color-border) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

/* ─── Badge neutre — états en attente, cycles clôturés ──────────────────── */
.badge-neutral {
  background: var(--color-border);
  color: var(--color-text-secondary);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 2: Nest `&--auto` inside the existing `.btn-primary` block**

In the same file, find the `.btn-primary` block and add `&--auto` inside it, before the closing brace:

```scss
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  background: var(--color-accent);
  color: #ffffff;
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  &:disabled {
    background: var(--color-border);
    color: var(--color-text-secondary);
    cursor: not-allowed;
  }

  &--auto {
    width: auto;
    padding: 0 var(--space-4);
  }
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
cd /home/tilstack/Bureau/tontine-web && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: `✓ Building...` with no SCSS errors.

- [ ] **Step 4: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/core/styles/_utilities.scss && git commit -m "feat(design-system): add skeleton, badge-neutral, btn-primary--auto utilities"
```

---

## Task 2: ConfirmDialogComponent (TDD)

**Files:**
- Create: `src/app/shared/components/confirm-dialog/confirm-dialog.component.spec.ts`
- Create: `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`
- Create: `src/app/shared/components/confirm-dialog/confirm-dialog.component.html`
- Create: `src/app/shared/components/confirm-dialog/confirm-dialog.component.scss`

- [ ] **Step 1: Write the failing spec**

Create `src/app/shared/components/confirm-dialog/confirm-dialog.component.spec.ts`:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

const errorData: ConfirmDialogData = {
  title: 'Forcer la clôture',
  message: "Les membres n'ayant pas payé seront pénalisés.",
  confirmLabel: 'Forcer la clôture',
  confirmColor: 'error',
};

function buildFixture(data: ConfirmDialogData): ComponentFixture<ConfirmDialogComponent> {
  TestBed.configureTestingModule({
    imports: [ConfirmDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: jest.fn() } },
    ],
  });
  const f = TestBed.createComponent(ConfirmDialogComponent);
  f.detectChanges();
  return f;
}

describe('ConfirmDialogComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders title, message, and confirmLabel from dialog data', () => {
    const f = buildFixture(errorData);
    const text: string = f.nativeElement.textContent;
    expect(text).toContain(errorData.title);
    expect(text).toContain(errorData.message);
    expect(text).toContain(errorData.confirmLabel);
  });

  it('confirm button has --error class when confirmColor is "error"', () => {
    const f = buildFixture(errorData);
    const btn: HTMLElement = f.nativeElement.querySelector('.confirm-dialog__confirm');
    expect(btn.classList.contains('confirm-dialog__confirm--error')).toBe(true);
    expect(btn.classList.contains('confirm-dialog__confirm--warning')).toBe(false);
  });

  it('confirm button has --warning class when confirmColor is "warning"', () => {
    const f = buildFixture({ ...errorData, confirmColor: 'warning' });
    const btn: HTMLElement = f.nativeElement.querySelector('.confirm-dialog__confirm');
    expect(btn.classList.contains('confirm-dialog__confirm--warning')).toBe(true);
    expect(btn.classList.contains('confirm-dialog__confirm--error')).toBe(false);
  });

  it('cancel button is present', () => {
    const f = buildFixture(errorData);
    const cancel = f.nativeElement.querySelector('[mat-stroked-button]');
    expect(cancel).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the spec — expect FAIL (component does not exist)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="confirm-dialog" --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './confirm-dialog.component'` or similar.

- [ ] **Step 3: Create the TypeScript**

Create `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'error' | 'warning';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
```

- [ ] **Step 4: Create the template**

Create `src/app/shared/components/confirm-dialog/confirm-dialog.component.html`:

```html
<h2 mat-dialog-title>{{ data.title }}</h2>

<mat-dialog-content>
  <p class="confirm-dialog__message">{{ data.message }}</p>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-stroked-button [mat-dialog-close]="undefined">Annuler</button>
  <button
    mat-flat-button
    class="confirm-dialog__confirm"
    [class.confirm-dialog__confirm--error]="data.confirmColor === 'error'"
    [class.confirm-dialog__confirm--warning]="data.confirmColor === 'warning'"
    [mat-dialog-close]="true">
    {{ data.confirmLabel }}
  </button>
</mat-dialog-actions>
```

- [ ] **Step 5: Create the SCSS**

Create `src/app/shared/components/confirm-dialog/confirm-dialog.component.scss`:

```scss
.confirm-dialog__message {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  margin: var(--space-2) 0;
}

.confirm-dialog__confirm {
  &--error {
    background: var(--color-error) !important;
    color: #fff !important;
  }

  &--warning {
    background: var(--color-warning) !important;
    color: #fff !important;
  }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="confirm-dialog" --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 4 passed, 4 total`.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/shared/components/confirm-dialog/ && git commit -m "feat(shared): add ConfirmDialogComponent with TDD"
```

---

## Task 3: CotisationStatusCard — extract + style

**Files:**
- Modify: `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.ts`
- Create: `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.html`
- Create: `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.scss`
- Create: `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/cotisation-status-card/cotisation-status-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationStatusCardComponent } from './cotisation-status-card.component';

describe('CotisationStatusCardComponent (smoke)', () => {
  it('renders without error with minimal inputs', () => {
    TestBed.configureTestingModule({
      imports: [CotisationStatusCardComponent, NoopAnimationsModule],
    });
    const fixture = TestBed.createComponent(CotisationStatusCardComponent);
    fixture.componentInstance.cycleStatus = null;
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run spec — expect PASS (baseline with inline template)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="cotisation-status-card" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 1 passed`.

- [ ] **Step 3: Update the TypeScript**

Replace the entire content of `cotisation-status-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { CycleStatus, Cotisation } from '../../../../core/models/cycle.model';

@Component({
  selector: 'app-cotisation-status-card',
  standalone: true,
  imports: [MatCard, MatCardContent, DatePipe, FcfaPipe],
  templateUrl: './cotisation-status-card.component.html',
  styleUrl: './cotisation-status-card.component.scss',
})
export class CotisationStatusCardComponent {
  @Input({ required: true }) cycleStatus!: CycleStatus | null;
  @Input() cotisation: Cotisation | undefined;
  @Input() montantCotisation: number = 0;
  @Input() deadline: Date | null = null;
}
```

- [ ] **Step 4: Create the template**

Create `cotisation-status-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="status-card__title">Ma cotisation</h3>

    @if (cycleStatus === 'closed') {
      <span class="badge-neutral">Cycle clôturé</span>
    } @else if (cotisation?.paid) {
      <span class="badge-success">Payé</span>
    } @else {
      <span class="badge-warning">Non payé</span>
      <p class="status-card__amount">{{ montantCotisation | fcfa }}</p>
      @if (deadline) {
        <p class="status-card__meta">Échéance : {{ deadline | date:'dd/MM/yyyy' }}</p>
      }
    }
  </mat-card-content>
</mat-card>
```

- [ ] **Step 5: Create the SCSS**

Create `cotisation-status-card.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

:host { display: block; }

.status-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.status-card__amount {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: var(--space-2);
}

.status-card__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="cotisation-status-card" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 1 passed`.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/cotisation-status-card/ && git commit -m "feat(dashboard): extract and style CotisationStatusCard"
```

---

## Task 4: ProgressionCard — extract + style

**Files:**
- Modify: `src/app/features/dashboard/shared/progression-card/progression-card.component.ts`
- Create: `progression-card.component.html`
- Create: `progression-card.component.scss`
- Create: `progression-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/progression-card/progression-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProgressionCardComponent } from './progression-card.component';

describe('ProgressionCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [ProgressionCardComponent, NoopAnimationsModule],
    });
    const fixture = TestBed.createComponent(ProgressionCardComponent);
    fixture.componentInstance.paidCount = 3;
    fixture.componentInstance.totalCount = 10;
    fixture.componentInstance.montantCotisation = 25000;
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect PASS (baseline)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="progression-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Update TypeScript**

Replace `progression-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';

@Component({
  selector: 'app-progression-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatProgressBar, FcfaPipe],
  templateUrl: './progression-card.component.html',
  styleUrl: './progression-card.component.scss',
})
export class ProgressionCardComponent {
  @Input({ required: true }) paidCount!: number;
  @Input({ required: true }) totalCount!: number;
  @Input({ required: true }) montantCotisation!: number;

  get progressPct(): number {
    if (!this.totalCount) return 0;
    return Math.min((this.paidCount / this.totalCount) * 100, 100);
  }
}
```

- [ ] **Step 4: Create the template**

Create `progression-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="progression-card__title">Progression collective</h3>
    <p class="progression-card__count">{{ paidCount }} / {{ totalCount }} membres ont cotisé</p>
    <mat-progress-bar class="progression-card__bar" mode="determinate" [value]="progressPct" />
    <div class="progression-card__amounts">
      <span class="progression-card__amounts-highlight">{{ paidCount * montantCotisation | fcfa }}</span>
      <span>sur {{ totalCount * montantCotisation | fcfa }}</span>
    </div>
  </mat-card-content>
</mat-card>
```

- [ ] **Step 5: Create the SCSS**

Create `progression-card.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

:host { display: block; }

.progression-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.progression-card__count {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.progression-card__bar {
  margin: var(--space-3) 0;
}

.progression-card__amounts {
  @include m.flex-between;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-2);
}

.progression-card__amounts-highlight {
  color: var(--color-success);
  font-weight: 600;
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="progression-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/progression-card/ && git commit -m "feat(dashboard): extract and style ProgressionCard"
```

---

## Task 5: MonRangCard — extract + style (preserve existing tests)

**Files:**
- Modify: `src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts`
- Create: `mon-rang-card.component.html`
- Create: `mon-rang-card.component.scss`
- Existing spec at `mon-rang-card.component.spec.ts` — must still pass (5 tests)

- [ ] **Step 1: Run existing tests — confirm 5 pass before touching anything**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="mon-rang-card" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed`.

- [ ] **Step 2: Update TypeScript**

Replace `mon-rang-card.component.ts`:

```typescript
import { Component, Input, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';
import { CycleService } from '../../../../core/services/cycle.service';

export type CtaState = 'none' | 'disabled' | 'active' | 'confirmed';

@Component({
  selector: 'app-mon-rang-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, MatTooltip, MatProgressSpinner, FcfaPipe],
  templateUrl: './mon-rang-card.component.html',
  styleUrl: './mon-rang-card.component.scss',
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

- [ ] **Step 3: Create the template**

Create `mon-rang-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="rang-card__title">Mon rang</h3>

    @if (ctaState === 'none') {
      <p class="rang-card__rank">Vous êtes #{{ myRank }} dans la liste des bénéficiaires.</p>
    } @else {
      <p class="rang-card__rank rang-card__rank--beneficiary">
        Vous êtes #{{ myRank }} — <strong>bénéficiaire de ce cycle</strong>
      </p>

      @if (ctaState === 'disabled') {
        <mat-card-actions>
          <button mat-flat-button disabled
            matTooltip="En attente de toutes les cotisations">
            Confirmer la réception
          </button>
        </mat-card-actions>
      } @else if (ctaState === 'active') {
        @if (error()) {
          <p class="rang-card__error alert-error">{{ error() }}</p>
        }
        <mat-card-actions>
          @if (loading()) {
            <mat-progress-spinner mode="indeterminate" diameter="24" />
          } @else {
            <button mat-flat-button (click)="confirmReception()">
              Confirmer la réception de {{ cycle?.montantVerse | fcfa }}
            </button>
          }
        </mat-card-actions>
      } @else if (ctaState === 'confirmed') {
        <span class="badge-success rang-card__confirmed">Réception confirmée</span>
      }
    }
  </mat-card-content>
</mat-card>
```

- [ ] **Step 4: Create the SCSS**

Create `mon-rang-card.component.scss`:

```scss
:host { display: block; }

.rang-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.rang-card__rank {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);

  &--beneficiary {
    color: var(--color-text-primary);
  }
}

.rang-card__error {
  margin-bottom: var(--space-2);
}

.rang-card__confirmed {
  margin-top: var(--space-2);
}
```

- [ ] **Step 5: Run the existing spec — all 5 tests must still pass**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="mon-rang-card" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 5 passed, 5 total`.

- [ ] **Step 6: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.ts src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.html src/app/features/dashboard/shared/mon-rang-card/mon-rang-card.component.scss && git commit -m "feat(dashboard): extract and style MonRangCard"
```

---

## Task 6: BeneficiaireCard — extract + style

**Files:**
- Modify: `src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.ts`
- Create: `beneficiaire-card.component.html`
- Create: `beneficiaire-card.component.scss`
- Create: `beneficiaire-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/beneficiaire-card/beneficiaire-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BeneficiaireCardComponent } from './beneficiaire-card.component';

const mockCycle: any = {
  id: 'c1', index: 1, beneficiaryUid: 'u1',
  status: 'open', totalPaid: 3, montantVerse: 0,
  confirmedAt: null, confirmedBy: null, closedAt: null, closedBy: null,
  deadline: { seconds: 9999999, nanoseconds: 0 },
  createdAt: { seconds: 0, nanoseconds: 0 },
  montantCaisse: 0,
};

describe('BeneficiaireCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [BeneficiaireCardComponent, NoopAnimationsModule],
    });
    const f = TestBed.createComponent(BeneficiaireCardComponent);
    f.componentInstance.cycle = mockCycle;
    f.componentInstance.members = [{ uid: 'u1', displayName: 'Alice', email: 'a@b.com', role: 'membre', rang: 1, hasBenefited: false, joinedAt: {} as any, mustResetPassword: false }];
    f.componentInstance.montantCotisation = 25000;
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect PASS (baseline)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="beneficiaire-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Update TypeScript**

Replace `beneficiaire-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-beneficiaire-card',
  standalone: true,
  imports: [MatCard, MatCardContent, DatePipe, FcfaPipe],
  templateUrl: './beneficiaire-card.component.html',
  styleUrl: './beneficiaire-card.component.scss',
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

- [ ] **Step 4: Create the template**

Create `beneficiaire-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="beneficiaire-card__title">Bénéficiaire du cycle</h3>
    <p class="beneficiaire-card__name">{{ beneficiaryName }}</p>
    <p class="beneficiaire-card__amount">{{ montantEstime | fcfa }}</p>

    @if (cycle.confirmedAt) {
      <span class="badge-success beneficiaire-card__badge">
        Confirmé le {{ cycle.confirmedAt.toDate() | date:'dd/MM/yyyy' }}
      </span>
    } @else {
      <span class="badge-neutral beneficiaire-card__badge">En attente de confirmation</span>
    }
  </mat-card-content>
</mat-card>
```

- [ ] **Step 5: Create the SCSS**

Create `beneficiaire-card.component.scss`:

```scss
:host { display: block; }

.beneficiaire-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.beneficiaire-card__name {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.beneficiaire-card__amount {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
  margin-bottom: var(--space-3);
}

.beneficiaire-card__badge {
  margin-top: var(--space-2);
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="beneficiaire-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/beneficiaire-card/ && git commit -m "feat(dashboard): extract and style BeneficiaireCard"
```

---

## Task 7: CotisationsListCard — extract + style + penalized badge

**Files:**
- Modify: `src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.ts`
- Create: `cotisations-list-card.component.html`
- Create: `cotisations-list-card.component.scss`
- Create: `cotisations-list-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/cotisations-list-card/cotisations-list-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationsListCardComponent } from './cotisations-list-card.component';

describe('CotisationsListCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [CotisationsListCardComponent, NoopAnimationsModule],
    });
    const f = TestBed.createComponent(CotisationsListCardComponent);
    f.componentInstance.cotisations = [];
    f.componentInstance.members = [];
    f.componentInstance.cycleStatus = 'open';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect PASS (baseline)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="cotisations-list-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Update TypeScript**

Replace `cotisations-list-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
    MatButton, MatProgressSpinner,
  ],
  templateUrl: './cotisations-list-card.component.html',
  styleUrl: './cotisations-list-card.component.scss',
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

- [ ] **Step 4: Create the template**

Create `cotisations-list-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="cotisations-card__title">
      Cotisations — {{ paidCount }} / {{ members.length }} payées
    </h3>
    <table mat-table [dataSource]="rows" class="cotisations-card__table">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Membre</th>
        <td mat-cell *matCellDef="let r">{{ r.displayName }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Statut</th>
        <td mat-cell *matCellDef="let r">
          @if (r.cotisation?.paid) {
            <span class="badge-success">Payé</span>
          } @else if (r.cotisation?.penalized) {
            <span class="badge-error">Pénalisé</span>
          } @else {
            <span class="badge-warning">Non payé</span>
          }
        </td>
      </ng-container>

      <ng-container matColumnDef="action">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let r">
          @if (!r.cotisation?.paid && cycleStatus === 'open') {
            @if (markingUid === r.uid) {
              <mat-progress-spinner mode="indeterminate" diameter="20" />
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
```

- [ ] **Step 5: Create the SCSS**

Create `cotisations-list-card.component.scss`:

```scss
:host { display: block; }

.cotisations-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.cotisations-card__table {
  width: 100%;
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="cotisations-list-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/cotisations-list-card/ && git commit -m "feat(dashboard): extract and style CotisationsListCard, add penalized badge"
```

---

## Task 8: CaisseSummaryCard — extract + style

**Files:**
- Modify: `src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.ts`
- Create: `caisse-summary-card.component.html`
- Create: `caisse-summary-card.component.scss`
- Create: `caisse-summary-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/caisse-summary-card/caisse-summary-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { CaisseSummaryCardComponent } from './caisse-summary-card.component';

describe('CaisseSummaryCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [CaisseSummaryCardComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialog, useValue: { open: jest.fn() } }],
    });
    const f = TestBed.createComponent(CaisseSummaryCardComponent);
    f.componentInstance.caisse = undefined;
    f.componentInstance.transactions = [];
    f.componentInstance.deptId = 'd1';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect PASS (baseline)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="caisse-summary-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Update TypeScript**

Replace `caisse-summary-card.component.ts`:

```typescript
import { Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { CaisseDoc, TransactionDoc } from '../../../../core/models/caisse.model';
import { AddTransactionDialogComponent } from '../../../caisse/caisse/add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse-summary-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, DatePipe, FcfaPipe],
  templateUrl: './caisse-summary-card.component.html',
  styleUrl: './caisse-summary-card.component.scss',
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

- [ ] **Step 4: Create the template**

Create `caisse-summary-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="caisse-card__title">Caisse</h3>
    <p class="caisse-card__solde">{{ caisse?.solde | fcfa }}</p>

    @if (recentTransactions.length > 0) {
      <ul class="caisse-card__txlist">
        @for (t of recentTransactions; track t.id) {
          <li class="caisse-card__tx">
            <span class="caisse-card__tx-label">{{ t.libelle || t.categorie }}</span>
            <span class="caisse-card__tx-amount"
              [class.caisse-card__tx-amount--credit]="t.type === 'credit'"
              [class.caisse-card__tx-amount--debit]="t.type === 'debit'">
              {{ t.type === 'credit' ? '+' : '-' }}{{ t.montant | fcfa }}
            </span>
            <span class="caisse-card__tx-date">{{ t.createdAt.toDate() | date:'dd/MM' }}</span>
          </li>
        }
      </ul>
    }
  </mat-card-content>

  <mat-card-actions>
    <button mat-stroked-button (click)="openAddDialog()">
      Ajouter une transaction
    </button>
  </mat-card-actions>
</mat-card>
```

- [ ] **Step 5: Create the SCSS**

Create `caisse-summary-card.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

:host { display: block; }

.caisse-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.caisse-card__solde {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.caisse-card__txlist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.caisse-card__tx {
  @include m.flex-between;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.caisse-card__tx-label {
  flex: 1;
  color: var(--color-text-primary);
}

.caisse-card__tx-date {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.caisse-card__tx-amount {
  font-weight: 600;
  margin: 0 var(--space-2);

  &--credit { color: var(--color-success); }
  &--debit  { color: var(--color-error); }
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="caisse-summary-card" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/caisse-summary-card/ && git commit -m "feat(dashboard): extract and style CaisseSummaryCard"
```

---

## Task 9: HistoryCard — extract + style

**Files:**
- Modify: `src/app/features/dashboard/shared/history-card/history-card.component.ts`
- Create: `history-card.component.html`
- Create: `history-card.component.scss`
- Create: `history-card.component.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `src/app/features/dashboard/shared/history-card/history-card.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { HistoryCardComponent } from './history-card.component';

describe('HistoryCardComponent (smoke)', () => {
  it('renders without error with empty cycles', () => {
    TestBed.configureTestingModule({
      imports: [HistoryCardComponent, NoopAnimationsModule],
      providers: [provideRouter([])],
    });
    const f = TestBed.createComponent(HistoryCardComponent);
    f.componentInstance.closedCycles = [];
    f.componentInstance.members = [];
    f.componentInstance.myUid = 'u1';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect PASS (baseline)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="history-card.component.spec" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: Update TypeScript**

Replace `history-card.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-history-card',
  standalone: true,
  imports: [MatCard, MatCardContent, RouterLink, DatePipe, FcfaPipe],
  templateUrl: './history-card.component.html',
  styleUrl: './history-card.component.scss',
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

- [ ] **Step 4: Create the template**

Create `history-card.component.html`:

```html
<mat-card>
  <mat-card-content>
    <h3 class="history-card__title">Historique récent</h3>

    @if (recentCycles.length === 0) {
      <p class="history-card__empty">Aucun cycle clôturé.</p>
    } @else {
      <ul class="history-card__list">
        @for (c of recentCycles; track c.id) {
          <li class="history-card__item">
            <span class="history-card__cycle">Cycle #{{ c.index }}</span>
            <span class="history-card__name">{{ getMemberName(c.beneficiaryUid) }}</span>
            <span class="history-card__amount">{{ c.montantVerse | fcfa }}</span>
            <span class="history-card__date">{{ c.closedAt?.toDate() | date:'dd/MM/yy' }}</span>
            @if (c.beneficiaryUid === myUid) {
              <span class="badge-success">Bénéficiaire</span>
            }
          </li>
        }
      </ul>
    }

    <a class="history-card__link link-primary" routerLink="/app/cycles/history">
      Voir tout l'historique →
    </a>
  </mat-card-content>
</mat-card>
```

- [ ] **Step 5: Create the SCSS**

Create `history-card.component.scss`:

```scss
:host { display: block; }

.history-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.history-card__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.history-card__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.history-card__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.history-card__cycle { color: var(--color-text-secondary); }
.history-card__name  { flex: 1; color: var(--color-text-primary); font-weight: 500; }
.history-card__amount { color: var(--color-text-primary); font-weight: 600; }
.history-card__date  { color: var(--color-text-secondary); font-size: var(--font-size-xs); }

.history-card__link {
  display: block;
  margin-top: var(--space-3);
}
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="history-card.component.spec" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/shared/history-card/ && git commit -m "feat(dashboard): extract and style HistoryCard"
```

---

## Task 10: MembreDashboard — extract + skeleton + grid

**Files:**
- Modify: `src/app/features/dashboard/membre/membre-dashboard.component.ts`
- Create: `membre-dashboard.component.html`
- Create: `membre-dashboard.component.scss`
- Create: `membre-dashboard.component.spec.ts`

- [ ] **Step 1: Write the spec**

Create `src/app/features/dashboard/membre/membre-dashboard.component.spec.ts`:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MembreDashboardComponent } from './membre-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('MembreDashboardComponent', () => {
  it('shows skeleton (.dashboard-loading) when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [MembreDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<MembreDashboardComponent> = TestBed.createComponent(MembreDashboardComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeNull();
  });

  it('shows grid (.dashboard-grid) when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [MembreDashboardComponent, NoopAnimationsModule],
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
      ],
    });
    const f: ComponentFixture<MembreDashboardComponent> = TestBed.createComponent(MembreDashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeNull();
  });
});
```

- [ ] **Step 2: Run spec — expect FAIL (no templateUrl yet)**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="membre-dashboard.component.spec" --no-coverage 2>&1 | tail -10
```

Expected: FAIL (component uses inline `template:` — no `.dashboard-loading` / `.dashboard-grid` classes).

- [ ] **Step 3: Update the TypeScript**

Replace `membre-dashboard.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
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
    CotisationStatusCardComponent,
    ProgressionCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  templateUrl: './membre-dashboard.component.html',
  styleUrl: './membre-dashboard.component.scss',
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

- [ ] **Step 4: Create the template**

Create `membre-dashboard.component.html`:

```html
@if (!ctx()) {
  <div class="dashboard-loading">
    <div class="card-skeleton">
      <div class="skeleton skeleton-line skeleton-line--lg"></div>
      <div class="skeleton skeleton-line skeleton-line--full"></div>
    </div>
    <div class="card-skeleton">
      <div class="skeleton skeleton-line skeleton-line--lg"></div>
      <div class="skeleton skeleton-line skeleton-line--full"></div>
      <div class="skeleton skeleton-line skeleton-line--sm"></div>
    </div>
    <div class="card-skeleton">
      <div class="skeleton skeleton-line skeleton-line--lg"></div>
      <div class="skeleton skeleton-line skeleton-line--full"></div>
    </div>
    <div class="card-skeleton dashboard-grid__full">
      <div class="skeleton skeleton-line skeleton-line--lg"></div>
      <div class="skeleton skeleton-line skeleton-line--full"></div>
      <div class="skeleton skeleton-line skeleton-line--full"></div>
    </div>
  </div>
} @else {
  <div class="dashboard-grid">
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
      class="dashboard-grid__full"
      [closedCycles]="ctx()!.closedCycles"
      [members]="ctx()!.members"
      [myUid]="ctx()!.uid">
    </app-history-card>
  </div>
}
```

- [ ] **Step 5: Create the SCSS**

Create `membre-dashboard.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-4);
}

.dashboard-grid__full {
  grid-column: 1 / -1;
}

.dashboard-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.card-skeleton {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
}

.skeleton-line--lg   { height: 24px; }
.skeleton-line--sm   { height: 12px; width: 60%; }
.skeleton-line--full { width: 100%; }
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="membre-dashboard.component.spec" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 2 passed`.

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/membre/ && git commit -m "feat(dashboard): extract and style MembreDashboard with skeleton + grid"
```

---

## Task 11: BureauDashboard — extract + skeleton + grid

**Files:**
- Modify: `src/app/features/dashboard/bureau/bureau-dashboard.component.ts`
- Create: `bureau-dashboard.component.html`
- Create: `bureau-dashboard.component.scss`
- Create: `bureau-dashboard.component.spec.ts`

- [ ] **Step 1: Write the spec**

Create `src/app/features/dashboard/bureau/bureau-dashboard.component.spec.ts`:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BureauDashboardComponent } from './bureau-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';

describe('BureauDashboardComponent', () => {
  it('shows skeleton when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [BureauDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
        { provide: CaisseService, useValue: {} },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<BureauDashboardComponent> = TestBed.createComponent(BureauDashboardComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeNull();
  });

  it('shows grid when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [BureauDashboardComponent, NoopAnimationsModule],
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
        {
          provide: CaisseService,
          useValue: { watchCaisse: () => of(undefined), watchTransactions: () => of([]) },
        },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<BureauDashboardComponent> = TestBed.createComponent(BureauDashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run spec — expect FAIL**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="bureau-dashboard.component.spec" --no-coverage 2>&1 | tail -10
```

- [ ] **Step 3: Update TypeScript**

Replace `bureau-dashboard.component.ts`:

```typescript
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
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

@Component({
  selector: 'app-bureau-dashboard',
  standalone: true,
  imports: [
    CotisationsListCardComponent,
    CaisseSummaryCardComponent,
    BeneficiaireCardComponent,
    CotisationStatusCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  templateUrl: './bureau-dashboard.component.html',
  styleUrl: './bureau-dashboard.component.scss',
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

- [ ] **Step 4: Create the template**

Create `bureau-dashboard.component.html`:

```html
@if (!ctx()) {
  <div class="dashboard-loading">
    @for (i of [1, 2, 3, 4, 5, 6]; track i) {
      <div class="card-skeleton">
        <div class="skeleton skeleton-line skeleton-line--lg"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
      </div>
    }
  </div>
} @else {
  <div class="dashboard-grid">
    @if (ctx()!.cycleData) {
      <app-cotisations-list-card
        class="dashboard-grid__full"
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
      class="dashboard-grid__full"
      [closedCycles]="ctx()!.closedCycles"
      [members]="ctx()!.members"
      [myUid]="ctx()!.uid">
    </app-history-card>
  </div>
}
```

- [ ] **Step 5: Create the SCSS**

Create `bureau-dashboard.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-4);
}

.dashboard-grid__full {
  grid-column: 1 / -1;
}

.dashboard-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.card-skeleton {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
}

.skeleton-line--lg   { height: 24px; }
.skeleton-line--sm   { height: 12px; width: 60%; }
.skeleton-line--full { width: 100%; }
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="bureau-dashboard.component.spec" --no-coverage 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/bureau/ && git commit -m "feat(dashboard): extract and style BureauDashboard with skeleton + grid"
```

---

## Task 12: AdminDashboard — extract + skeleton + grid + ConfirmDialog + responsive members

**Files:**
- Modify: `src/app/features/dashboard/admin/admin-dashboard.component.ts`
- Create: `admin-dashboard.component.html`
- Create: `admin-dashboard.component.scss`
- Create: `admin-dashboard.component.spec.ts`

- [ ] **Step 1: Write the spec**

Create `src/app/features/dashboard/admin/admin-dashboard.component.spec.ts`:

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';

describe('AdminDashboardComponent', () => {
  it('shows skeleton when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
        { provide: CaisseService, useValue: {} },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<AdminDashboardComponent> = TestBed.createComponent(AdminDashboardComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeNull();
  });

  it('shows grid when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, NoopAnimationsModule],
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
            updateUserRole: jest.fn(),
          },
        },
        { provide: SaisonService, useValue: { watchActiveSaison: () => of(null) } },
        { provide: CycleService, useValue: {} },
        {
          provide: CaisseService,
          useValue: { watchCaisse: () => of(undefined), watchTransactions: () => of([]) },
        },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<AdminDashboardComponent> = TestBed.createComponent(AdminDashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run spec — expect FAIL**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="admin-dashboard.component.spec" --no-coverage 2>&1 | tail -10
```

- [ ] **Step 3: Update TypeScript**

Replace `admin-dashboard.component.ts`:

```typescript
import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';
import { InviteDialogComponent } from '../../membres/invite-dialog/invite-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserProfile, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatButton, MatIconButton, MatIcon, MatCard, MatCardContent, MatCardActions,
    MatTooltip, MatProgressSpinner,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    CotisationsListCardComponent, CaisseSummaryCardComponent, BeneficiaireCardComponent,
    MonRangCardComponent, HistoryCardComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
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

  confirmForceClose(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Forcer la clôture du cycle',
        message: "Êtes-vous sûr de vouloir forcer la clôture ? Les membres n'ayant pas payé seront pénalisés.",
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

- [ ] **Step 4: Create the template**

Create `admin-dashboard.component.html`:

```html
@if (!ctx()) {
  <div class="dashboard-loading">
    @for (i of [1, 2, 3, 4, 5]; track i) {
      <div class="card-skeleton">
        <div class="skeleton skeleton-line skeleton-line--lg"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
      </div>
    }
  </div>
} @else {
  <div class="dashboard-grid">

    <!-- Alerte no-saison -->
    @if (!ctx()!.saison) {
      <div class="alert-warning dashboard-grid__full admin-no-saison">
        <span>Aucune saison en cours — Configurez une nouvelle saison pour démarrer.</span>
        <button class="btn-primary btn-primary--auto" [routerLink]="'/app/cycles/setup'">
          Créer une saison
        </button>
      </div>
    }

    <!-- Bloc 1 — Actions cycle -->
    @if (ctx()!.cycleData) {
      <mat-card class="dashboard-grid__full">
        <mat-card-content>
          <h3 class="cycle-card__title">
            Cycle #{{ ctx()!.cycleData!.cycle.index }} —
            {{ ctx()!.cycleData!.cycle.status === 'open' ? 'Ouvert' : 'Clôturé' }}
          </h3>
          @if (cycleError()) {
            <p class="alert-error cycle-card__error">{{ cycleError() }}</p>
          }
        </mat-card-content>
        <mat-card-actions class="cycle-card__actions">
          @if (ctx()!.cycleData!.cycle.status === 'open') {
            @if (cycleLoading()) {
              <mat-progress-spinner mode="indeterminate" diameter="24" />
            } @else if (deadlinePassed()) {
              <button mat-stroked-button class="btn-force-close" (click)="confirmForceClose()">
                Forcer la clôture
              </button>
            } @else {
              <button mat-flat-button disabled
                matTooltip="En attente de la confirmation du bénéficiaire">
                Clôturer le cycle
              </button>
            }
          } @else {
            @if (cycleLoading()) {
              <mat-progress-spinner mode="indeterminate" diameter="24" />
            } @else if (canOpenNext()) {
              <button class="btn-primary btn-primary--auto" (click)="onOpenNext()">
                Ouvrir le cycle suivant
              </button>
            } @else if (ctx()!.saison?.status === 'completed') {
              <button class="btn-primary btn-primary--auto" [routerLink]="'/app/cycles/setup'">
                Créer une nouvelle saison
              </button>
            }
          }
        </mat-card-actions>
      </mat-card>
    }

    <!-- Bloc 2 — Membres -->
    <mat-card class="dashboard-grid__full">
      <mat-card-content>
        <div class="admin-members__header">
          <h3>Membres ({{ ctx()!.members.length }})</h3>
          <button mat-stroked-button (click)="openInviteDialog()">Inviter un membre</button>
        </div>
        @if (roleError()) {
          <p class="alert-error">{{ roleError() }}</p>
        }

        <!-- Desktop : mat-table -->
        <div class="admin-members__table-wrap">
          <table mat-table [dataSource]="ctx()!.members" class="admin-members__table">
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
                  <button mat-icon-button [disabled]="roleUpdatingUid() === m.uid"
                    (click)="updateRole(m, 'bureau')" aria-label="Promouvoir en Bureau">
                    <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                  </button>
                } @else if (m.role === 'bureau') {
                  <button mat-icon-button [disabled]="roleUpdatingUid() === m.uid"
                    (click)="updateRole(m, 'membre')" aria-label="Rétrograder en Membre">
                    <mat-icon aria-hidden="true">arrow_downward</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="memberColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: memberColumns"></tr>
          </table>
        </div>

        <!-- Mobile : card list -->
        <div class="admin-members__list">
          @for (m of ctx()!.members; track m.uid) {
            <mat-card class="member-card">
              <mat-card-content>
                <div class="member-card__body">
                  <div class="member-card__info">
                    <span class="member-card__name">{{ m.displayName }}</span>
                    <span class="member-card__email">{{ m.email }}</span>
                    <span class="badge-neutral member-card__role">{{ m.role }}</span>
                  </div>
                  <div class="member-card__actions">
                    @if (m.role === 'membre') {
                      <button mat-icon-button [disabled]="roleUpdatingUid() === m.uid"
                        (click)="updateRole(m, 'bureau')" aria-label="Promouvoir en Bureau">
                        <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                      </button>
                    } @else if (m.role === 'bureau') {
                      <button mat-icon-button [disabled]="roleUpdatingUid() === m.uid"
                        (click)="updateRole(m, 'membre')" aria-label="Rétrograder en Membre">
                        <mat-icon aria-hidden="true">arrow_downward</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Bloc 3 — Cotisations + Caisse -->
    @if (ctx()!.cycleData) {
      <app-cotisations-list-card
        class="dashboard-grid__full"
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

    <!-- Bloc 4 — Infos perso -->
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
      class="dashboard-grid__full"
      [closedCycles]="ctx()!.closedCycles"
      [members]="ctx()!.members"
      [myUid]="ctx()!.uid">
    </app-history-card>

  </div>
}
```

- [ ] **Step 5: Create the SCSS**

Create `admin-dashboard.component.scss`:

```scss
@use 'app/core/styles/mixins' as m;

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-4);
  padding: var(--space-4);
}

.dashboard-grid__full {
  grid-column: 1 / -1;
}

.dashboard-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
}

.card-skeleton {
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
}

.skeleton-line--lg   { height: 24px; }
.skeleton-line--sm   { height: 12px; width: 60%; }
.skeleton-line--full { width: 100%; }

/* Alerte no-saison */
.admin-no-saison {
  @include m.flex-between;
  gap: var(--space-4);
}

/* Bloc cycle */
.cycle-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.cycle-card__error {
  margin-top: var(--space-2);
}

.cycle-card__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Bouton forcer clôture */
.btn-force-close {
  color: var(--color-warning) !important;
  border-color: var(--color-warning) !important;
}

/* Bloc membres */
.admin-members__header {
  @include m.flex-between;
  margin-bottom: var(--space-3);
}

.admin-members__table {
  width: 100%;
}

.admin-members__table-wrap {
  display: none;

  @include m.desktop { display: block; }
}

.admin-members__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);

  @include m.desktop { display: none; }
}

/* Mobile member cards */
.member-card__body    { @include m.flex-between; }
.member-card__info    { display: flex; flex-direction: column; gap: var(--space-1); }
.member-card__name    { font-weight: 600; color: var(--color-text-primary); }
.member-card__email   { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.member-card__role    { margin-top: var(--space-1); }
.member-card__actions { display: flex; align-items: center; }
```

- [ ] **Step 6: Run spec — expect PASS**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --testPathPattern="admin-dashboard.component.spec" --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 2 passed`.

- [ ] **Step 7: Run full test suite — all tests must pass**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --no-coverage 2>&1 | tail -15
```

Expected: All tests pass. If any fail, fix before committing.

- [ ] **Step 8: Commit**

```bash
cd /home/tilstack/Bureau/tontine-web && git add src/app/features/dashboard/admin/ && git commit -m "feat(dashboard): extract and style AdminDashboard with skeleton, grid, ConfirmDialog, responsive members"
```

---

## Final Verification

- [ ] **Run complete test suite**

```bash
cd /home/tilstack/Bureau/tontine-web && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All tests pass (existing 5 MonRangCard + new specs across 12 tasks).

- [ ] **Verify build**

```bash
cd /home/tilstack/Bureau/tontine-web && npx ng build --configuration=development 2>&1 | tail -5
```

Expected: Build succeeds with no errors.

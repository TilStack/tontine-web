# Dashboard Views (Sub-project 4) Design Spec

## Goal

Apply the Design System to all 3 dashboard pages (membre, bureau, admin) and their 7 shared card components. Zero inline styles. Responsive card grid with `auto-fit`. Skeleton loaders at the page level. FcfaPipe for all monetary values. Generic `ConfirmDialogComponent` for destructive actions. Badge utilities for cotisation status.

## Architecture

All 10 existing components move from inline `template:` to external `.html` + from no SCSS to external `.scss`. The inline template approach is incompatible with component-scoped stylesheets, so extraction is required.

One new shared component is created: `ConfirmDialogComponent`. It is generic (title, message, confirmLabel, confirmColor) and replaces the hard-coded confirm flow for "Forcer la clôture" in the admin dashboard.

Two global utilities are added to `_utilities.scss`: `.badge-neutral` (grey badge for "en attente" / "cycle clôturé" states) and `.btn-primary--auto` (width-auto variant of `.btn-primary` for inline card usage). The `.skeleton` animation class is also added.

## Tech Stack

Angular 18 standalone components. Angular Material: `MatCard`, `MatCardContent`, `MatCardActions`, `MatTable`, `MatDialog`, `MatProgressBar`, `MatIconButton`, `MatStrokedButton`. SCSS with `@use 'app/core/styles/mixins' as m`. Design system tokens (`_tokens.scss`). `FcfaPipe`. `DatePipe`. `@if`/`@for` control flow (no `NgIf`/`NgFor`).

---

## File Structure

### Create (new files)

```
src/app/shared/components/confirm-dialog/
  confirm-dialog.component.ts
  confirm-dialog.component.html
  confirm-dialog.component.scss
  confirm-dialog.component.spec.ts
```

### Modify

- `src/app/core/styles/_utilities.scss` — add `.badge-neutral`, `.btn-primary--auto`, `.skeleton`

### Extract + Style (10 components — add `.html` + `.scss`, update `.ts`)

```
features/dashboard/membre/
  membre-dashboard.component.ts        ← change template: → templateUrl:, add styleUrl:
  membre-dashboard.component.html      ← new
  membre-dashboard.component.scss      ← new

features/dashboard/bureau/
  bureau-dashboard.component.ts
  bureau-dashboard.component.html      ← new
  bureau-dashboard.component.scss      ← new

features/dashboard/admin/
  admin-dashboard.component.ts
  admin-dashboard.component.html       ← new
  admin-dashboard.component.scss       ← new

features/dashboard/shared/cotisation-status-card/
  cotisation-status-card.component.ts
  cotisation-status-card.component.html   ← new
  cotisation-status-card.component.scss   ← new

features/dashboard/shared/progression-card/
  progression-card.component.ts
  progression-card.component.html         ← new
  progression-card.component.scss         ← new

features/dashboard/shared/mon-rang-card/
  mon-rang-card.component.ts
  mon-rang-card.component.html            ← new
  mon-rang-card.component.scss            ← new

features/dashboard/shared/beneficiaire-card/
  beneficiaire-card.component.ts
  beneficiaire-card.component.html        ← new
  beneficiaire-card.component.scss        ← new

features/dashboard/shared/cotisations-list-card/
  cotisations-list-card.component.ts
  cotisations-list-card.component.html    ← new
  cotisations-list-card.component.scss    ← new

features/dashboard/shared/caisse-summary-card/
  caisse-summary-card.component.ts
  caisse-summary-card.component.html      ← new
  caisse-summary-card.component.scss      ← new

features/dashboard/shared/history-card/
  history-card.component.ts
  history-card.component.html             ← new
  history-card.component.scss             ← new
```

---

## Design Decisions

### 1. Responsive Grid (dashboard pages only)

Each dashboard page `.scss` defines a `.dashboard-grid` that uses `auto-fit` columns. Shared cards receive their layout from the parent — they do not define their own width.

```scss
// membre-dashboard.component.scss
// bureau-dashboard.component.scss
// admin-dashboard.component.scss
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
```

**Full-width items per view (`dashboard-grid__full`):**
- Membre: `history-card`
- Bureau: `cotisations-list-card`, `history-card`
- Admin: cycle-actions block, membres block, `cotisations-list-card`, `history-card`

### 2. Skeleton Loading

Data is fetched at the dashboard page level via `toSignal(context$)`. When `!ctx()`, the page renders a skeleton grid of placeholder cards instead of a global spinner. Cards themselves never show loading state — they are pure display components.

Skeleton structure in each dashboard page template:

```html
@if (!ctx()) {
  <div class="dashboard-loading">
    <div class="card-skeleton">
      <div class="skeleton" style-less-line-1></div>
      <div class="skeleton" style-less-line-2></div>
    </div>
    <!-- repeat for each real card in the page -->
  </div>
} @else {
  <div class="dashboard-grid">
    <!-- real card components -->
  </div>
}
```

The `.skeleton` class (from `_utilities.scss`) provides the shimmer animation. Skeleton line heights are defined in the dashboard page SCSS (not inline):

```scss
.skeleton-line {
  height: 16px;
  border-radius: var(--radius-sm);
}
.skeleton-line--lg { height: 24px; }
.skeleton-line--sm { height: 12px; width: 60%; }
.skeleton-line--full { width: 100%; }
```

### 3. Badge Status

Use global utility classes from `_utilities.scss`. No inline colors in templates.

| State | Template | Source |
|-------|----------|--------|
| `paid: true` | `<span class="badge-success">Payé</span>` | existing utility |
| `paid: false && !penalized` | `<span class="badge-warning">Non payé</span>` | existing utility |
| `penalized: true` | `<span class="badge-error">Pénalisé</span>` | existing utility |
| Cycle clôturé / en attente confirmation | `<span class="badge-neutral">…</span>` | new utility |

The `penalized` badge state is new — currently `CotisationsListCard` only shows paid/en-attente. After this pass it shows all three states.

### 4. Utilities to Add (`_utilities.scss`)

```scss
/* Skeleton shimmer */
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

/* Badge neutre — états en attente, cycles clôturés */
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

/* Bouton ambre width-auto pour usage dans les cards */
.btn-primary--auto {
  width: auto;
  padding: 0 var(--space-4);
}
```

### 5. Button Hierarchy (Admin Dashboard)

Three distinct button styles — defined by intent, not just by color:

| Button | Style | Implementation |
|--------|-------|----------------|
| "Ouvrir le cycle suivant" | Ambre, action positive | `<button class="btn-primary btn-primary--auto" (click)="onOpenNext()">` |
| "Créer une saison" | Ambre, démarrage | `<button class="btn-primary btn-primary--auto" [routerLink]="'/app/cycles/setup'">` |
| "Forcer la clôture" | Warning stroked, irréversible | `<button mat-stroked-button class="btn-force-close" (click)="confirmForceClose()">` |
| "Promouvoir / Rétrograder" | Neutre, réversible fréquent | `<button mat-icon-button (click)="updateRole(m, …)" [attr.aria-label]="…">` |

The `.btn-force-close` class is defined in `admin-dashboard.component.scss`:
```scss
.btn-force-close {
  color: var(--color-warning) !important;
  border-color: var(--color-warning) !important;
}
```

"Clôturer le cycle" (disabled while pending beneficiary) stays as `mat-flat-button` with `disabled` attribute — no color change needed since it's already disabled.

### 6. ConfirmDialogComponent

Generic reusable confirmation dialog for all destructive actions across the project.

**Interface:**
```typescript
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: 'error' | 'warning';
}
```

**Selector:** `app-confirm-dialog`

**Returns:** `true` when confirmed, `undefined` when cancelled (MatDialog default on backdrop click / cancel button).

**Template structure:**
```html
<h2 mat-dialog-title>{{ data.title }}</h2>
<mat-dialog-content>
  <p class="confirm-dialog__message">{{ data.message }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-stroked-button [mat-dialog-close]="undefined">Annuler</button>
  <button mat-flat-button class="confirm-dialog__confirm" [mat-dialog-close]="true">
    {{ data.confirmLabel }}
  </button>
</mat-dialog-actions>
```

**SCSS:** The confirm button color is driven by `data.confirmColor`, applied via individual class bindings (using `[class]="..."` would overwrite the base class — use `[class.modifier]="condition"` instead):

```html
<button mat-flat-button
  class="confirm-dialog__confirm"
  [class.confirm-dialog__confirm--error]="data.confirmColor === 'error'"
  [class.confirm-dialog__confirm--warning]="data.confirmColor === 'warning'"
  [mat-dialog-close]="true">
  {{ data.confirmLabel }}
</button>
```

```scss
.confirm-dialog__confirm--error   { background: var(--color-error) !important; color: #fff !important; }
.confirm-dialog__confirm--warning { background: var(--color-warning) !important; color: #fff !important; }
```

**Usage in admin (force-close):**
```typescript
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
```

### 7. FcfaPipe — Replacement Map

Replace `| number` with `| fcfa` for monetary amounts. Remove trailing `FCFA` text when the pipe appends it. Remove `DecimalPipe` from imports where it's no longer needed (keep `DatePipe` where dates are shown).

| Component | Expression before | Expression after |
|-----------|-------------------|-----------------|
| `cotisation-status-card` | `montantCotisation \| number \| FCFA` | `montantCotisation \| fcfa` |
| `progression-card` | `paidCount * montantCotisation \| number \| FCFA` | `paidCount * montantCotisation \| fcfa` |
| `mon-rang-card` | `cycle?.montantVerse \| number \| FCFA` | `cycle?.montantVerse \| fcfa` |
| `beneficiaire-card` | `montantEstime \| number \| FCFA` | `montantEstime \| fcfa` |
| `caisse-summary-card` | `caisse?.solde \| number \| FCFA` | `caisse?.solde \| fcfa` |
| `caisse-summary-card` | `t.montant \| number \| FCFA` | `t.montant \| fcfa` |
| `history-card` | `c.montantVerse \| number \| FCFA` | `c.montantVerse \| fcfa` |

Import `FcfaPipe` in the `imports` array of each card component that shows amounts.

### 8. Admin Members — Responsive Table/Card

Two parallel DOM structures, toggled via CSS only (no `@if`):

```html
<!-- Desktop: mat-table -->
<div class="admin-members__table-wrap">
  <table mat-table [dataSource]="ctx()!.members">
    <!-- columns: name, email, role, action -->
  </table>
</div>

<!-- Mobile: card list -->
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
              <button mat-icon-button (click)="updateRole(m, 'bureau')"
                [disabled]="roleUpdatingUid() === m.uid"
                aria-label="Promouvoir en Bureau">
                <mat-icon aria-hidden="true">arrow_upward</mat-icon>
              </button>
            } @else if (m.role === 'bureau') {
              <button mat-icon-button (click)="updateRole(m, 'membre')"
                [disabled]="roleUpdatingUid() === m.uid"
                aria-label="Rétrograder en Membre">
                <mat-icon aria-hidden="true">arrow_downward</mat-icon>
              </button>
            }
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  }
</div>
```

```scss
// admin-dashboard.component.scss
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

.member-card__body { @include m.flex-between; }
.member-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.member-card__name { font-weight: 600; color: var(--color-text-primary); }
.member-card__email { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
```

### 9. No-Saison Alert (Admin)

Replace the hardcoded inline alert div with the `.alert-warning` utility class:

```html
@if (!ctx()!.saison) {
  <div class="alert-warning dashboard-grid__full admin-no-saison">
    <span>Aucune saison en cours — Configurez une nouvelle saison pour démarrer.</span>
    <button class="btn-primary btn-primary--auto" [routerLink]="'/app/cycles/setup'">
      Créer une saison
    </button>
  </div>
}
```

```scss
// admin-dashboard.component.scss
.admin-no-saison {
  @include m.flex-between;
  gap: var(--space-4);
}
```

### 10. Card SCSS Shared Pattern

Each shared card's SCSS file uses this base pattern (BEM block name varies per card):

```scss
// Example: cotisation-status-card.component.scss
@use 'app/core/styles/mixins' as m;

:host { display: block; }

.status-card {
  // mat-card handles radius-lg + shadow-sm globally — don't repeat
}

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
}

.status-card__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}
```

### BEM Block Names Per Card

| Component | BEM block |
|-----------|-----------|
| `CotisationStatusCard` | `.status-card` |
| `ProgressionCard` | `.progression-card` |
| `MonRangCard` | `.rang-card` |
| `BeneficiaireCard` | `.beneficiaire-card` |
| `CotisationsListCard` | `.cotisations-card` |
| `CaisseSummaryCard` | `.caisse-card` |
| `HistoryCard` | `.history-card` |

### 11. ProgressionCard — Visual Bar

`MatProgressBar` is kept for the collective progression bar. Its SCSS override uses the design system:

```scss
// progression-card.component.scss
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

Template:
```html
<p class="progression-card__count">{{ paidCount }} / {{ totalCount }} membres ont cotisé</p>
<mat-progress-bar class="progression-card__bar" mode="determinate" [value]="progressPct" />
<div class="progression-card__amounts">
  <span class="progression-card__amounts-highlight">{{ paidCount * montantCotisation | fcfa }}</span>
  <span>sur {{ totalCount * montantCotisation | fcfa }}</span>
</div>
```

### 12. CaisseCard — Transaction List

Credit/debit coloring via BEM modifiers (not inline `[style.color]`):

```scss
.caisse-card__tx-amount--credit { color: var(--color-success); }
.caisse-card__tx-amount--debit  { color: var(--color-error); }
```

```html
<span class="caisse-card__tx-amount"
  [class.caisse-card__tx-amount--credit]="t.type === 'credit'"
  [class.caisse-card__tx-amount--debit]="t.type === 'debit'">
  {{ t.type === 'credit' ? '+' : '-' }}{{ t.montant | fcfa }}
</span>
```

---

## Testing Requirements

### ConfirmDialogComponent spec
- Renders `data.title`, `data.message`, `data.confirmLabel` from injected dialog data
- Clicking confirm button closes dialog with `true`
- Clicking cancel button closes dialog with `undefined`
- Confirm button has `.confirm-dialog__confirm--error` class when `confirmColor === 'error'`

### Existing MonRangCard spec (5 tests)
Must still pass after template extraction — logic is unchanged, only `template:` → `templateUrl:`.

### Dashboard page specs (3 new specs)
- Renders skeleton grid when `ctx()` signal is null (services return NEVER or of(null))
- Renders `.dashboard-grid` when `ctx()` signal has value

### Shared card specs (smoke tests — no new logic to test)
- Each card renders without error given valid `@Input()` values

---

## Constraints Summary

- Zero inline `style=""` attributes in any template
- Zero `| number` for monetary amounts — use `| fcfa`
- No `DecimalPipe` in imports when only monetary values remain (keep `DatePipe` for dates)
- `mat-card` radius and shadow come from global `styles.scss` — do not redeclare
- `@use 'app/core/styles/mixins' as m` — available via `stylePreprocessorOptions.includePaths: ['src/']`
- All colors via design system tokens — no hardcoded hex except `#fff` in badge utilities
- `color-mix()` for transparency effects — no `rgba(var(--token), x)` syntax

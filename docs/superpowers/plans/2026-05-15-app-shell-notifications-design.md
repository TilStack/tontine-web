# App Shell + Notifications Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Styling pass on AppShellComponent, NotificationBellComponent, and NotificationPanelComponent — mobile-first responsive layout using design system tokens exclusively, zero hardcoded values, zero inline styles.

**Architecture:**
- AppShell: drop `mat-sidenav-container`, replace with pure-CSS layout — desktop sidebar (240px fixed left) + sticky topbar; mobile bottom nav (64px, icons + labels).
- NotificationBell: add SCSS file, add `aria-hidden` on decorative icon, keep MatMenu dropdown approach.
- NotificationPanel: remove all inline styles, add SCSS file, replace `mat-button` with plain CSS button.

**Tech Stack:** Angular 18 standalone, SCSS with `@use 'app/core/styles/mixins' as m`, design tokens from `_tokens.scss`, Jest for tests.

---

## File Structure

| Status | Path | Change |
|--------|------|--------|
| Create | `src/app/shared/components/app-shell/app-shell.component.spec.ts` | new spec (TDD) |
| Modify | `src/app/shared/components/app-shell/app-shell.component.html` | full rewrite |
| Modify | `src/app/shared/components/app-shell/app-shell.component.scss` | full rewrite |
| Modify | `src/app/shared/components/app-shell/app-shell.component.ts` | remove mat-sidenav imports, add styleUrl |
| Create | `src/app/shared/components/notification-bell/notification-bell.component.scss` | new |
| Modify | `src/app/shared/components/notification-bell/notification-bell.component.ts` | add styleUrl |
| Modify | `src/app/shared/components/notification-bell/notification-bell.component.html` | add aria-hidden |
| Create | `src/app/shared/components/notification-panel/notification-panel.component.scss` | new |
| Modify | `src/app/shared/components/notification-panel/notification-panel.component.ts` | add styleUrl, remove MatButton |
| Modify | `src/app/shared/components/notification-panel/notification-panel.component.html` | remove all inline styles, BEM classes |

---

## Task 1 — AppShellComponent: responsive layout

**Files:**
- Create: `src/app/shared/components/app-shell/app-shell.component.spec.ts`
- Modify: `src/app/shared/components/app-shell/app-shell.component.html`
- Modify: `src/app/shared/components/app-shell/app-shell.component.scss`
- Modify: `src/app/shared/components/app-shell/app-shell.component.ts`

### Step 1 — Write failing spec

```typescript
// src/app/shared/components/app-shell/app-shell.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserProfile } from '../../../core/models/user.model';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let authMock: jest.Mocked<Pick<AuthService, 'getClaims' | 'user$' | 'currentUser' | 'logout'>>;
  let userMock: jest.Mocked<Pick<UserService, 'watchProfile'>>;

  beforeEach(async () => {
    authMock = {
      getClaims: jest.fn().mockResolvedValue(null),
      user$: of(null) as any,
      currentUser: null,
      logout: jest.fn(),
    };
    userMock = { watchProfile: jest.fn().mockReturnValue(of(null)) };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: UserService, useValue: userMock },
        { provide: NotificationService, useValue: { watchNotifications: jest.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('visibleNavItems() returns [] when profile is null', () => {
    expect(component.visibleNavItems()).toHaveLength(0);
  });

  it('visibleNavItems() returns 7 items for admin role', () => {
    component.profile.set({ role: 'admin' } as UserProfile);
    expect(component.visibleNavItems()).toHaveLength(7);
  });

  it('visibleNavItems() filters correctly for membre role', () => {
    component.profile.set({ role: 'membre' } as UserProfile);
    const items = component.visibleNavItems();
    expect(items.every(i => i.roles.includes('membre'))).toBe(true);
    expect(items.length).toBe(3);
  });

  it('logout() delegates to authService.logout()', () => {
    component.logout();
    expect(authMock.logout).toHaveBeenCalled();
  });
});
```

- [ ] Create the spec file above at `src/app/shared/components/app-shell/app-shell.component.spec.ts`

### Step 2 — Run spec to confirm it executes (may pass or fail on create)

Run: `npx jest app-shell --passWithNoTests --no-coverage`

Expected: PASS (existing component already has the tested methods)

If it fails with a compilation error, read the error and fix before proceeding.

### Step 3 — Rewrite `app-shell.component.html`

Replace the entire file with:

```html
<div class="shell">
  <!-- Desktop sidebar -->
  <aside class="sidebar" aria-label="Navigation principale">
    <div class="sidebar__brand">
      <mat-icon class="sidebar__brand-icon" aria-hidden="true">savings</mat-icon>
      <span class="sidebar__brand-name">Tontine Départ.</span>
    </div>

    <nav class="sidebar__nav">
      @for (item of visibleNavItems(); track item.route) {
        <a class="sidebar__nav-item"
           [routerLink]="item.route"
           routerLinkActive="sidebar__nav-item--active"
           [routerLinkActiveOptions]="{ exact: item.route === '/app' }"
           [attr.aria-label]="item.label">
          <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
          <span class="sidebar__nav-label">{{ item.label }}</span>
        </a>
      }
    </nav>

    <div class="sidebar__footer">
      @if (profile(); as p) {
        <div class="sidebar__avatar" aria-hidden="true">
          {{ p.displayName.charAt(0).toUpperCase() }}
        </div>
        <div class="sidebar__user-info">
          <span class="sidebar__user-name">{{ p.displayName }}</span>
          <span class="sidebar__user-role">{{ p.role }}</span>
        </div>
      }
      <button class="sidebar__logout" (click)="logout()" aria-label="Déconnexion">
        <mat-icon aria-hidden="true">logout</mat-icon>
      </button>
    </div>
  </aside>

  <!-- Right column: topbar + content -->
  <div class="shell__main">
    <header class="topbar">
      <div class="topbar__dept">
        <span class="topbar__dept-label">Département</span>
        <span class="topbar__dept-name">{{ deptId() ?? '…' }}</span>
      </div>
      <div class="topbar__actions">
        @if (deptId() && uid()) {
          <app-notification-bell [deptId]="deptId()!" [uid]="uid()!" />
        }
        @if (profile(); as p) {
          <div class="topbar__avatar" [attr.aria-label]="p.displayName">
            {{ p.displayName.charAt(0).toUpperCase() }}
          </div>
        }
        <button class="topbar__logout" (click)="logout()" aria-label="Déconnexion">
          <mat-icon aria-hidden="true">logout</mat-icon>
        </button>
      </div>
    </header>

    <main class="shell__content">
      <router-outlet />
    </main>
  </div>

  <!-- Mobile bottom nav -->
  <nav class="bottom-nav" aria-label="Navigation mobile">
    @for (item of visibleNavItems(); track item.route) {
      <a class="bottom-nav__item"
         [routerLink]="item.route"
         routerLinkActive="bottom-nav__item--active"
         [routerLinkActiveOptions]="{ exact: item.route === '/app' }"
         [attr.aria-label]="item.label">
        <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
        <span class="bottom-nav__label">{{ item.label }}</span>
      </a>
    }
  </nav>
</div>
```

- [ ] Replace `app-shell.component.html` with the template above

### Step 4 — Rewrite `app-shell.component.scss`

Replace the entire file with:

```scss
@use 'app/core/styles/mixins' as m;

// ── Wrapper ────────────────────────────────────────────────────
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-background);
}

// ── Sidebar (desktop only) ────────────────────────────────────
.sidebar {
  display: none;

  @include m.desktop {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--sidebar-width);
    background: var(--sidebar-bg);
    color: var(--sidebar-text);
    z-index: 100;
    transition: width var(--transition-base);
  }
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &-icon {
    color: var(--sidebar-accent);
    font-size: 28px;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  &-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--sidebar-text);
    @include m.truncate;
  }
}

.sidebar__nav {
  flex: 1;
  padding: var(--space-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.sidebar__nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: var(--font-size-sm);
  font-weight: 500;
  border-left: 3px solid transparent;
  transition: background var(--transition-base), border-left-color var(--transition-base), color var(--transition-base);

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
    color: inherit;
    opacity: 0.7;
    flex-shrink: 0;
    transition: opacity var(--transition-base);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  &--active {
    background: rgba(245, 158, 11, 0.12);
    border-left-color: var(--sidebar-accent);
    color: var(--sidebar-accent);

    mat-icon { opacity: 1; }
  }
}

.sidebar__nav-label {
  @include m.truncate;
}

.sidebar__footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--sidebar-accent);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  @include m.flex-center;
  flex-shrink: 0;
}

.sidebar__user-info {
  flex: 1;
  min-width: 0;
}

.sidebar__user-name {
  display: block;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--sidebar-text);
  @include m.truncate;
}

.sidebar__user-role {
  display: block;
  font-size: 10px;
  color: rgba(226, 232, 240, 0.5);
  text-transform: capitalize;
}

.sidebar__logout {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  color: rgba(226, 232, 240, 0.5);
  @include m.flex-center;
  transition: color var(--transition-fast), background var(--transition-fast);

  &:hover {
    color: var(--sidebar-text);
    background: rgba(255, 255, 255, 0.08);
  }

  mat-icon {
    font-size: 18px;
    width: 18px;
    height: 18px;
  }
}

// ── Right column ──────────────────────────────────────────────
.shell__main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include m.desktop {
    margin-left: var(--sidebar-width);
  }
}

// ── Topbar ────────────────────────────────────────────────────
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  height: 56px;
  padding: 0 var(--space-4);
  @include m.flex-between;

  @include m.desktop {
    height: 64px;
    padding: 0 var(--space-6);
  }
}

.topbar__dept {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.topbar__dept-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

.topbar__dept-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  @include m.truncate;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.topbar__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: #ffffff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  @include m.flex-center;
  cursor: default;
  user-select: none;
}

.topbar__logout {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  @include m.flex-center;
  transition: background var(--transition-fast), color var(--transition-fast);

  &:hover {
    background: var(--color-border);
    color: var(--color-text-primary);
  }

  mat-icon {
    font-size: 20px;
    width: 20px;
    height: 20px;
  }
}

// ── Main content ──────────────────────────────────────────────
.shell__content {
  flex: 1;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-4) + var(--sidebar-collapsed)); // 64px bottom-nav clearance on mobile

  @include m.desktop {
    padding: var(--space-6);
  }
}

// ── Bottom nav (mobile only) ──────────────────────────────────
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--sidebar-collapsed); // 64px
  background: var(--sidebar-bg);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;

  @include m.desktop {
    display: none;
  }
}

.bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--sidebar-text);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  opacity: 0.55;
  transition: opacity var(--transition-base), color var(--transition-base);
  min-width: 0;
  flex: 1;

  mat-icon {
    font-size: 22px;
    width: 22px;
    height: 22px;
  }

  &--active {
    color: var(--sidebar-accent);
    opacity: 1;
  }
}

.bottom-nav__label {
  font-size: 10px;
  font-weight: 500;
  @include m.truncate;
  max-width: 56px;
}
```

- [ ] Replace `app-shell.component.scss` with the SCSS above

### Step 5 — Update `app-shell.component.ts`

Remove `MatSidenav`, `MatSidenavContainer`, `MatSidenavContent`, `MatNavList`, `MatListItem`, `MatIconButton` from imports. Add `styleUrl`. Keep all logic unchanged.

```typescript
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserProfile, UserRole } from '../../../core/models/user.model';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', route: '/app',             icon: 'dashboard',       roles: ['admin', 'bureau', 'membre'] },
  { label: 'Cotisations',     route: '/app/cotisations', icon: 'payments',        roles: ['admin', 'bureau', 'membre'] },
  { label: 'Membres',         route: '/app/membres',     icon: 'group',           roles: ['admin', 'bureau', 'membre'] },
  { label: 'Caisse',          route: '/app/caisse',      icon: 'account_balance', roles: ['admin', 'bureau'] },
  { label: 'Cycles',          route: '/app/cycles',      icon: 'loop',            roles: ['admin'] },
  { label: 'Invitations',     route: '/app/invitations', icon: 'send',            roles: ['admin'] },
  { label: 'Paramètres',      route: '/app/parametres',  icon: 'settings',        roles: ['admin'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIcon,
    NotificationBellComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);

  readonly user$ = this.authService.user$;

  profile = signal<UserProfile | null>(null);
  deptId = signal<string | null>(null);
  uid = signal<string | null>(null);

  visibleNavItems = computed(() => {
    const role = this.profile()?.role;
    if (!role) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(role));
  });

  async ngOnInit(): Promise<void> {
    const claims = await this.authService.getClaims();
    if (!claims?.deptId) return;
    this.deptId.set(claims.deptId);

    const currentUid = this.authService.currentUser?.uid;
    if (!currentUid) return;
    this.uid.set(currentUid);

    this.userService.watchProfile(claims.deptId, currentUid).subscribe((p) => {
      if (p) this.profile.set(p);
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
```

- [ ] Replace `app-shell.component.ts` with the code above

### Step 6 — Run all tests

Run: `npx jest --passWithNoTests --no-coverage`

Expected: all suites pass (20 suites now with the new app-shell spec)

If any spec fails, read the error and fix before proceeding.

### Step 7 — Commit

```bash
git add src/app/shared/components/app-shell/
git commit -m "style: redesign AppShell — responsive sidebar + topbar + mobile bottom nav"
```

---

## Task 2 — NotificationBellComponent: SCSS + accessibility

**Files:**
- Create: `src/app/shared/components/notification-bell/notification-bell.component.scss`
- Modify: `src/app/shared/components/notification-bell/notification-bell.component.ts`
- Modify: `src/app/shared/components/notification-bell/notification-bell.component.html`

### Step 1 — Create `notification-bell.component.scss`

```scss
:host {
  display: inline-flex;
  align-items: center;
}

// Badge override — use design system error color
::ng-deep .mat-badge-content {
  background: var(--color-error);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
}
```

- [ ] Create the SCSS file above at `src/app/shared/components/notification-bell/notification-bell.component.scss`

### Step 2 — Add `styleUrl` to decorator and remove unused `Input` import

Current `notification-bell.component.ts` imports `Input` from `@angular/core`. `@Input` is still used, so keep it. Just add `styleUrl`:

```typescript
import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatBadge } from '@angular/material/badge';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { NotificationDoc } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    MatBadge,
    MatMenu,
    MatMenuTrigger,
    NotificationPanelComponent,
  ],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent implements OnInit {
  @Input({ required: true }) deptId!: string;
  @Input({ required: true }) uid!: string;

  private notifService = inject(NotificationService);

  readonly notifications = signal<NotificationDoc[]>([]);
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length
  );

  ngOnInit(): void {
    this.notifService
      .watchNotifications(this.deptId, this.uid)
      .subscribe((notifs) => this.notifications.set(notifs));
  }
}
```

- [ ] Modify `notification-bell.component.ts` — add `styleUrl` line to decorator

### Step 3 — Add `aria-hidden="true"` to the mat-icon in the button

Current HTML:
```html
<button
  mat-icon-button
  [matMenuTriggerFor]="notifMenu"
  [matBadge]="unreadCount()"
  [matBadgeHidden]="unreadCount() === 0"
  matBadgeColor="warn"
  aria-label="Notifications">
  <mat-icon>notifications</mat-icon>
</button>
```

Updated HTML (add `aria-hidden="true"` to the icon — button already has `aria-label`):

```html
<button
  mat-icon-button
  [matMenuTriggerFor]="notifMenu"
  [matBadge]="unreadCount()"
  [matBadgeHidden]="unreadCount() === 0"
  matBadgeColor="warn"
  aria-label="Notifications">
  <mat-icon aria-hidden="true">notifications</mat-icon>
</button>

<mat-menu #notifMenu="matMenu">
  <div (click)="$event.stopPropagation()">
    <app-notification-panel
      [deptId]="deptId"
      [uid]="uid"
      [notifications]="notifications()">
    </app-notification-panel>
  </div>
</mat-menu>
```

- [ ] Modify `notification-bell.component.html` — add `aria-hidden="true"` on `<mat-icon>`

### Step 4 — Run tests

Run: `npx jest notification-bell --passWithNoTests --no-coverage`

Expected: all 3 existing tests pass

### Step 5 — Commit

```bash
git add src/app/shared/components/notification-bell/
git commit -m "style: add SCSS and aria-hidden fix to NotificationBellComponent"
```

---

## Task 3 — NotificationPanelComponent: remove inline styles, add SCSS

**Files:**
- Create: `src/app/shared/components/notification-panel/notification-panel.component.scss`
- Modify: `src/app/shared/components/notification-panel/notification-panel.component.ts`
- Modify: `src/app/shared/components/notification-panel/notification-panel.component.html`

### Step 1 — Create `notification-panel.component.scss`

```scss
.notif-panel {
  min-width: 320px;
  max-width: 400px;

  &__empty {
    padding: var(--space-4);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: var(--font-size-sm);
  }

  &__header {
    padding: var(--space-2) var(--space-4);
    display: flex;
    justify-content: flex-end;
  }

  &__mark-all {
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-family);
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-primary);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);

    &:hover {
      background: rgba(30, 27, 75, 0.06);
    }
  }
}

.notif-item {
  cursor: pointer;
  transition: background var(--transition-fast);

  &:hover {
    background: var(--color-background);
  }

  &--unread {
    font-weight: 600;

    mat-icon {
      color: var(--color-accent);
    }
  }
}
```

- [ ] Create `notification-panel.component.scss` with the code above

### Step 2 — Add `styleUrl`, remove `MatButton` from TS

`MatButton` was used for `mat-button` directive on the "mark all" button. We're replacing it with a plain CSS button. Remove `MatButton` from imports:

```typescript
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { NotificationService } from '../../../core/services/notification.service';
import {
  NotificationDoc,
  NotificationType,
} from '../../../core/models/notification.model';

const NOTIFICATION_ROUTES: Record<NotificationType, string> = {
  rappel_j5: '/app/cycles',
  paiement_enregistre: '/app/cycles',
  cagnotte_complete: '/app/cycles',
  penalite_appliquee: '/app/cycles/history',
  beneficiaire_confirme: '/app/cycles',
  cycle_ouvert: '/app/cycles',
  cycle_cloture: '/app/cycles/history',
};

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [MatList, MatListItem, MatIcon, MatDivider],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss',
})
export class NotificationPanelComponent {
  @Input({ required: true }) deptId!: string;
  @Input({ required: true }) uid!: string;
  @Input({ required: true }) notifications!: NotificationDoc[];

  private notifService = inject(NotificationService);
  private router = inject(Router);

  async handleClick(notif: NotificationDoc): Promise<void> {
    await this.notifService.markAsRead(this.deptId, this.uid, notif.id);
    this.router.navigate([NOTIFICATION_ROUTES[notif.type]]);
  }

  async handleMarkAll(): Promise<void> {
    const unreadIds = this.notifications
      .filter((n) => !n.read)
      .map((n) => n.id);
    await this.notifService.markAllAsRead(this.deptId, this.uid, unreadIds);
  }
}
```

- [ ] Modify `notification-panel.component.ts` — add `styleUrl`, remove `MatButton` from imports array and import statement

### Step 3 — Rewrite `notification-panel.component.html`

Remove ALL inline `style="..."` attributes. Use BEM classes. Replace `mat-button` with plain CSS button:

```html
<div class="notif-panel">
  @if (notifications.length === 0) {
    <p class="notif-panel__empty">Aucune notification.</p>
  } @else {
    <div class="notif-panel__header">
      <button class="notif-panel__mark-all" (click)="handleMarkAll()">
        Tout marquer comme lu
      </button>
    </div>
    <mat-divider />
    <mat-list>
      @for (notif of notifications; track notif.id) {
        <mat-list-item
          class="notif-item"
          [class.notif-item--unread]="!notif.read"
          (click)="handleClick(notif)">
          <mat-icon matListItemIcon aria-hidden="true">
            {{ notif.read ? 'notifications_none' : 'notifications_active' }}
          </mat-icon>
          <span matListItemTitle>{{ notif.title }}</span>
          <span matListItemLine>{{ notif.body }}</span>
        </mat-list-item>
      }
    </mat-list>
  }
</div>
```

- [ ] Replace `notification-panel.component.html` with the template above

### Step 4 — Run all tests

Run: `npx jest --passWithNoTests --no-coverage`

Expected: all 20 suites pass

### Step 5 — Commit

```bash
git add src/app/shared/components/notification-panel/
git commit -m "style: remove inline styles, add SCSS and BEM classes to NotificationPanelComponent"
```

---

## Final check

After all tasks complete, run the full suite one more time:

```bash
npx jest --passWithNoTests --no-coverage
```

Expected: 20 suites, ≥75 tests, 0 failures.

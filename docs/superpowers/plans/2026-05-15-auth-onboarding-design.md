# Auth + Onboarding Design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer le Design System Foundation aux 5 pages auth/onboarding — SCSS pur, zéro inline style.

**Architecture:** Un `AuthLayoutComponent` partagé fournit la card centrée + branding pour toutes les pages via `<ng-content />`. Chaque page importe ce composant et projette son contenu. Les classes utilitaires (`.btn-primary`, `.link-primary`, `.alert-*`) sont ajoutées à `_utilities.scss` une seule fois.

**Tech Stack:** Angular 18 (standalone, signals, `@if`), Angular Material M3, SCSS avec `@use 'app/core/styles/mixins' as m`, Jest

---

## Baseline

Avant de commencer : vérifier que les 68 tests passent.

```bash
cd /home/tilstack/Bureau/tontine-web
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 68 passed, 68 total`

---

## Task 1 : Ajouts `_utilities.scss`

**Fichiers :**
- Modifier : `src/app/core/styles/_utilities.scss`

Ajouter les 3 blocs suivants à la **fin** du fichier (après `.card`). Ne pas modifier le contenu existant.

- [ ] **Étape 1 : Lire le fichier existant pour confirmer la fin**

```bash
tail -5 src/app/core/styles/_utilities.scss
```

Expected : dernière classe `.card { ... }` — confirme qu'on peut ajouter en fin de fichier.

- [ ] **Étape 2 : Ajouter les classes utilitaires**

Ajouter à la fin de `src/app/core/styles/_utilities.scss` :

```scss

/* Lien de navigation primaire */
.link-primary {
  color: var(--color-primary);
  font-weight: 500;
  font-size: var(--font-size-sm);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom-color var(--transition-fast);
  &:hover {
    border-bottom-color: var(--color-primary);
  }
}

/* Bouton CTA pleine largeur — ambre, touch-friendly */
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
}

/* Bandeaux d'alerte */
%alert-base {
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-top: var(--space-3);
}

.alert-error {
  @extend %alert-base;
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid var(--color-error);
  color: var(--color-error);
}

.alert-warning {
  @extend %alert-base;
  background: rgba(249, 115, 22, 0.08);
  border-left: 3px solid var(--color-warning);
  color: var(--color-warning);
}

.alert-success {
  @extend %alert-base;
  background: rgba(16, 185, 129, 0.08);
  border-left: 3px solid var(--color-success);
  color: #064e3b; /* #10b981 sur blanc = 3.0:1 — insuffisant WCAG AA */
}
```

- [ ] **Étape 3 : Vérifier que les tests passent toujours**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 68 passed, 68 total`

- [ ] **Étape 4 : Commit**

```bash
git add src/app/core/styles/_utilities.scss
git commit -m "style: add link-primary, btn-primary, alert utilities to _utilities.scss"
```

---

## Task 2 : AuthLayoutComponent

**Fichiers :**
- Créer : `src/app/features/auth/auth-layout/auth-layout.component.spec.ts`
- Créer : `src/app/features/auth/auth-layout/auth-layout.component.ts`
- Créer : `src/app/features/auth/auth-layout/auth-layout.component.html`
- Créer : `src/app/features/auth/auth-layout/auth-layout.component.scss`

- [ ] **Étape 1 : Écrire le test qui échoue**

Créer `src/app/features/auth/auth-layout/auth-layout.component.spec.ts` :

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthLayoutComponent } from './auth-layout.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [AuthLayoutComponent],
  template: `<app-auth-layout><p class="test-child">contenu</p></app-auth-layout>`,
})
class HostComponent {}

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('se monte correctement', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('projette le contenu enfant via ng-content', () => {
    const child = fixture.nativeElement.querySelector('.test-child');
    expect(child).toBeTruthy();
    expect(child.textContent).toBe('contenu');
  });
});
```

- [ ] **Étape 2 : Lancer le test — vérifier qu'il échoue**

```bash
npx jest auth-layout --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './auth-layout.component'`

- [ ] **Étape 3 : Créer le TypeScript**

Créer `src/app/features/auth/auth-layout/auth-layout.component.ts` :

```typescript
import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
```

- [ ] **Étape 4 : Créer le template HTML**

Créer `src/app/features/auth/auth-layout/auth-layout.component.html` :

```html
<div class="auth-wrapper">
  <div class="auth-brand">
    <mat-icon class="auth-brand__icon">savings</mat-icon>
    <h2 class="h2 auth-brand__title">Tontine Départementale</h2>
    <p class="caption auth-brand__subtitle">Gérez votre épargne collective</p>
  </div>
  <div class="auth-card">
    <ng-content />
  </div>
</div>
```

- [ ] **Étape 5 : Créer le SCSS**

Créer `src/app/features/auth/auth-layout/auth-layout.component.scss` :

```scss
@use 'app/core/styles/mixins' as m;

.auth-wrapper {
  min-height: 100vh;
  background: var(--color-background);
  @include m.flex-center;
  flex-direction: column;
  padding: var(--space-6) var(--space-4);
}

.auth-brand {
  @include m.flex-center;
  flex-direction: column;
  margin-bottom: var(--space-6);
  text-align: center;
}

.auth-brand__icon {
  font-size: 40px;
  width: 40px;
  height: 40px;
  color: var(--color-accent);
  margin-bottom: var(--space-2);

  @include m.desktop {
    font-size: 48px;
    width: 48px;
    height: 48px;
  }
}

.auth-brand__title {
  color: var(--color-primary);
  margin-bottom: var(--space-1);
}

.auth-brand__subtitle {
  color: var(--color-text-secondary);
}

.auth-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-6);
  width: 100%;
  max-width: 420px;
}
```

- [ ] **Étape 6 : Lancer les tests — vérifier 2 nouveaux tests passent**

```bash
npx jest auth-layout --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 2 passed, 2 total`

- [ ] **Étape 7 : Vérifier que les 70 tests (68 + 2) passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 8 : Commit**

```bash
git add src/app/features/auth/auth-layout/
git commit -m "feat: add AuthLayoutComponent with ng-content projection and brand header"
```

---

## Task 3 : Page Login

**Fichiers :**
- Modifier : `src/app/features/auth/login/login.component.ts`
- Modifier : `src/app/features/auth/login/login.component.html`
- Créer : `src/app/features/auth/login/login.component.scss`

Le composant a déjà sa logique TypeScript complète (`form`, `loading`, `error`, `submit()`). Il s'agit d'un styling pass — on remplace le template et on ajoute le SCSS.

- [ ] **Étape 1 : Ajouter `AuthLayoutComponent` aux imports du TS**

Dans `src/app/features/auth/login/login.component.ts`, ajouter l'import et l'ajouter au tableau `imports` :

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.login(
        this.form.value.email as string,
        this.form.value.password as string,
      );
      await this.router.navigate(['/app']);
    } catch {
      this.error.set('Email ou mot de passe incorrect.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Étape 2 : Remplacer le template HTML**

Remplacer entièrement `src/app/features/auth/login/login.component.html` :

```html
<app-auth-layout>
  <h3 class="h3">Connexion</h3>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <mat-form-field appearance="outline">
      <mat-label>Email</mat-label>
      <input matInput type="email" formControlName="email" autocomplete="email" />
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Mot de passe</mat-label>
      <input matInput type="password" formControlName="password" autocomplete="current-password" />
    </mat-form-field>

    @if (error()) {
      <div class="alert-error" role="alert">{{ error() }}</div>
    }

    <div class="form-footer">
      <button class="btn-primary" type="submit" [disabled]="loading()">
        @if (loading()) {
          <mat-progress-spinner diameter="20" mode="indeterminate" />
        } @else {
          Se connecter
        }
      </button>
      <a class="link-primary" routerLink="/onboarding/request">
        Pas encore de compte ?
      </a>
    </div>
  </form>
</app-auth-layout>
```

- [ ] **Étape 3 : Créer le SCSS**

Créer `src/app/features/auth/login/login.component.scss` :

```scss
h3 {
  margin-bottom: var(--space-2);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

mat-form-field {
  width: 100%;
}

.form-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}
```

- [ ] **Étape 4 : Vérifier que les tests passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 5 : Commit**

```bash
git add src/app/features/auth/login/
git commit -m "style: apply design system to login page — AuthLayoutComponent + btn-primary + alert-error"
```

---

## Task 4 : Page Reset Password

**Fichiers :**
- Modifier : `src/app/features/auth/reset-password/reset-password.component.ts`
- Modifier : `src/app/features/auth/reset-password/reset-password.component.html`
- Créer : `src/app/features/auth/reset-password/reset-password.component.scss`

Note : `reset-password.component.ts` n'a pas encore `MatProgressSpinner` dans ses imports — à ajouter.

- [ ] **Étape 1 : Mettre à jour le TypeScript**

Remplacer entièrement `src/app/features/auth/reset-password/reset-password.component.ts` :

```typescript
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Auth, updatePassword } from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  loading = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || !this.auth.currentUser) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await updatePassword(
        this.auth.currentUser,
        this.form.value.password as string,
      );

      const claims = await this.authService.getClaims();
      if (claims?.deptId) {
        await this.userService.setMustResetPassword(
          claims.deptId,
          this.auth.currentUser.uid,
          false,
        );
      }

      await this.router.navigate(['/app']);
    } catch {
      this.error.set(
        'Impossible de changer le mot de passe. Reconnectez-vous et réessayez.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Étape 2 : Remplacer le template HTML**

Remplacer entièrement `src/app/features/auth/reset-password/reset-password.component.html` :

```html
<app-auth-layout>
  <h3 class="h3">Nouveau mot de passe</h3>
  <p class="body-text page-intro">
    Choisissez un mot de passe sécurisé. Il remplacera votre mot de passe temporaire.
  </p>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <mat-form-field appearance="outline">
      <mat-label>Nouveau mot de passe</mat-label>
      <input matInput type="password" formControlName="password" autocomplete="new-password" />
      @if (form.get('password')?.hasError('minlength')) {
        <mat-error>6 caractères minimum</mat-error>
      }
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Confirmer le mot de passe</mat-label>
      <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
      @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
        <mat-error>Les mots de passe ne correspondent pas</mat-error>
      }
    </mat-form-field>

    @if (error()) {
      <div class="alert-error" role="alert">{{ error() }}</div>
    }

    <button class="btn-primary" type="submit" [disabled]="loading() || form.invalid">
      @if (loading()) {
        <mat-progress-spinner diameter="20" mode="indeterminate" />
      } @else {
        Valider
      }
    </button>
  </form>
</app-auth-layout>
```

Note : pas de `.form-footer` ni de lien retour — flux forcé après invitation.

- [ ] **Étape 3 : Créer le SCSS**

Créer `src/app/features/auth/reset-password/reset-password.component.scss` :

```scss
h3 {
  margin-bottom: var(--space-1);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

mat-form-field {
  width: 100%;
}

.page-intro {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
```

- [ ] **Étape 4 : Vérifier que les tests passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 5 : Commit**

```bash
git add src/app/features/auth/reset-password/
git commit -m "style: apply design system to reset-password page"
```

---

## Task 5 : Page Accept Invitation

**Fichiers :**
- Modifier : `src/app/features/auth/accept-invitation/accept-invitation.component.ts`
- Modifier : `src/app/features/auth/accept-invitation/accept-invitation.component.html`
- Créer : `src/app/features/auth/accept-invitation/accept-invitation.component.scss`

Note : le signal s'appelle `tokenValid()` (pas `validToken()`). Le formControl s'appelle `displayName` (pas `name`).

- [ ] **Étape 1 : Ajouter `AuthLayoutComponent` aux imports du TS**

Remplacer entièrement `src/app/features/auth/accept-invitation/accept-invitation.component.ts` :

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './accept-invitation.component.html',
  styleUrl: './accept-invitation.component.scss',
})
export class AcceptInvitationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private functions = inject(Functions);
  private fb = inject(FormBuilder);

  token = signal<string | null>(null);
  deptId = signal<string | null>(null);
  invitationEmail = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  tokenValid = signal<boolean | null>(null);

  form: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const dept = params.get('dept');
    const token = params.get('token');

    if (!dept || !token) {
      this.tokenValid.set(false);
      return;
    }

    this.deptId.set(dept);
    this.token.set(token);

    try {
      const validateFn = httpsCallable<
        { deptId: string; token: string },
        { email: string; deptName: string }
      >(this.functions, 'validateInvitation');

      const result = await validateFn({ deptId: dept, token });
      this.invitationEmail.set(result.data.email);
      this.tokenValid.set(true);
    } catch {
      this.tokenValid.set(false);
    }
  }

  async submit(): Promise<void> {
    if (
      this.form.invalid ||
      !this.invitationEmail() ||
      !this.deptId() ||
      !this.token()
    )
      return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const { user } = await createUserWithEmailAndPassword(
        this.auth,
        this.invitationEmail()!,
        this.form.value.password as string,
      );
      await updateProfile(user, {
        displayName: this.form.value.displayName as string,
      });

      const acceptFn = httpsCallable<{ deptId: string; token: string }, void>(
        this.functions,
        'acceptInvitation',
      );
      await acceptFn({ deptId: this.deptId()!, token: this.token()! });

      await user.getIdToken(true);
      await this.router.navigate(['/app']);
    } catch {
      this.error.set(
        'Une erreur est survenue. Vérifiez que le lien est valide.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Étape 2 : Remplacer le template HTML**

Remplacer entièrement `src/app/features/auth/accept-invitation/accept-invitation.component.html` :

```html
<app-auth-layout>
  @if (tokenValid() === null) {
    <p class="body-text loading-state">Vérification du lien…</p>
  }

  @if (tokenValid() === false) {
    <h3 class="h3">Lien invalide</h3>
    <p class="body-text page-intro">
      Ce lien d'invitation est expiré ou invalide. Contactez votre administrateur.
    </p>
    <a class="link-primary" routerLink="/auth/login">Retour à la connexion</a>
  }

  @if (tokenValid() === true) {
    <h3 class="h3">Créer votre compte</h3>
    <p class="body-text page-intro">
      Invitation envoyée à <strong>{{ invitationEmail() }}</strong>.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Nom complet</mat-label>
        <input matInput formControlName="displayName" autocomplete="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mot de passe</mat-label>
        <input matInput type="password" formControlName="password" autocomplete="new-password" />
        @if (form.get('password')?.hasError('minlength')) {
          <mat-error>6 caractères minimum</mat-error>
        }
      </mat-form-field>

      @if (error()) {
        <div class="alert-error" role="alert">{{ error() }}</div>
      }

      <div class="form-footer">
        <button class="btn-primary" type="submit" [disabled]="loading()">
          @if (loading()) {
            <mat-progress-spinner diameter="20" mode="indeterminate" />
          } @else {
            Créer mon compte
          }
        </button>
        <a class="link-primary" routerLink="/auth/login">Retour à la connexion</a>
      </div>
    </form>
  }
</app-auth-layout>
```

- [ ] **Étape 3 : Créer le SCSS**

Créer `src/app/features/auth/accept-invitation/accept-invitation.component.scss` :

```scss
.loading-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-8) 0;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

mat-form-field {
  width: 100%;
}

.form-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.page-intro {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
```

- [ ] **Étape 4 : Vérifier que les tests passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 5 : Commit**

```bash
git add src/app/features/auth/accept-invitation/
git commit -m "style: apply design system to accept-invitation page — 3 states, alert-error, form-footer"
```

---

## Task 6 : Page No Department

**Fichiers :**
- Créer : `src/app/features/auth/no-department/no-department.component.html`
- Créer : `src/app/features/auth/no-department/no-department.component.scss`
- Modifier : `src/app/features/auth/no-department/no-department.component.ts`

Note : le composant a actuellement un `template` inline. On le remplace par `templateUrl` + `styleUrl`. `MatIcon` doit être ajouté aux imports.

- [ ] **Étape 1 : Créer le template HTML**

Créer `src/app/features/auth/no-department/no-department.component.html` :

```html
<app-auth-layout>
  <div class="no-dept">
    <mat-icon>info_outline</mat-icon>
    <h3 class="h3">Aucun département assigné</h3>
    <p class="body-text">
      Votre compte est créé mais vous n'avez pas encore été assigné à un département.
      Contactez votre administrateur.
    </p>
    <button mat-stroked-button (click)="logout()">Se déconnecter</button>
  </div>
</app-auth-layout>
```

- [ ] **Étape 2 : Mettre à jour le TypeScript**

Remplacer entièrement `src/app/features/auth/no-department/no-department.component.ts` :

```typescript
import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-no-department',
  standalone: true,
  imports: [MatButton, MatIcon, AuthLayoutComponent],
  templateUrl: './no-department.component.html',
  styleUrl: './no-department.component.scss',
})
export class NoDepartmentComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}
```

- [ ] **Étape 3 : Créer le SCSS**

Créer `src/app/features/auth/no-department/no-department.component.scss` :

```scss
.no-dept {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}
```

- [ ] **Étape 4 : Vérifier que les tests passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 5 : Commit**

```bash
git add src/app/features/auth/no-department/
git commit -m "style: apply design system to no-department page — extract template, add AuthLayoutComponent"
```

---

## Task 7 : Page Request Department

**Fichiers :**
- Modifier : `src/app/features/onboarding/request-department/request-department.component.ts`
- Modifier : `src/app/features/onboarding/request-department/request-department.component.html`
- Créer : `src/app/features/onboarding/request-department/request-department.component.scss`

Note : les formControls existants sont `requesterName`, `requesterEmail`, `deptName`, `message` — il n'y a pas de champ `phone`. Les labels du template reflètent ces noms réels.

- [ ] **Étape 1 : Ajouter `AuthLayoutComponent` aux imports du TS**

Remplacer entièrement `src/app/features/onboarding/request-department/request-department.component.ts` :

```typescript
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { AuthLayoutComponent } from '../../auth/auth-layout/auth-layout.component';

@Component({
  selector: 'app-request-department',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './request-department.component.html',
  styleUrl: './request-department.component.scss',
})
export class RequestDepartmentComponent {
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    requesterName: ['', Validators.required],
    requesterEmail: ['', [Validators.required, Validators.email]],
    deptName: ['', Validators.required],
    message: [''],
  });

  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const col = collection(this.firestore, 'department_requests');
      await addDoc(col, {
        ...this.form.value,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      this.submitted.set(true);
    } catch {
      this.error.set("Erreur lors de l'envoi. Réessayez.");
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Étape 2 : Remplacer le template HTML**

Remplacer entièrement `src/app/features/onboarding/request-department/request-department.component.html` :

```html
<app-auth-layout>
  @if (submitted()) {
    <div class="submitted">
      <h3 class="h3">Demande envoyée !</h3>
      <p class="body-text page-intro">
        Un administrateur va examiner votre demande et vous contacter par email.
      </p>
      <a class="link-primary" routerLink="/auth/login">Retour à la connexion</a>
    </div>
  } @else {
    <h3 class="h3">Rejoindre un département</h3>
    <p class="body-text page-intro">
      Remplissez ce formulaire pour demander l'accès à votre département.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Votre nom</mat-label>
        <input matInput formControlName="requesterName" autocomplete="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Votre email</mat-label>
        <input matInput type="email" formControlName="requesterEmail" autocomplete="email" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Nom du département souhaité</mat-label>
        <input matInput formControlName="deptName" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Message (optionnel)</mat-label>
        <textarea matInput formControlName="message" rows="3"></textarea>
      </mat-form-field>

      @if (error()) {
        <div class="alert-error" role="alert">{{ error() }}</div>
      }

      <div class="form-footer">
        <button class="btn-primary" type="submit" [disabled]="loading()">
          @if (loading()) {
            <mat-progress-spinner diameter="20" mode="indeterminate" />
          } @else {
            Envoyer la demande
          }
        </button>
        <a class="link-primary" routerLink="/auth/login">Déjà un compte ?</a>
      </div>
    </form>
  }
</app-auth-layout>
```

- [ ] **Étape 3 : Créer le SCSS**

Créer `src/app/features/onboarding/request-department/request-department.component.scss` :

```scss
.submitted {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

mat-form-field {
  width: 100%;
}

.form-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.page-intro {
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
```

- [ ] **Étape 4 : Vérifier que les 70 tests passent**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Étape 5 : Commit**

```bash
git add src/app/features/onboarding/request-department/
git commit -m "style: apply design system to request-department onboarding page"
```

---

## Vérification finale

- [ ] **Lancer la suite complète**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -5
```

Expected: `Tests: 70 passed, 70 total`

- [ ] **Vérifier qu'il n'y a aucun inline style dans les templates modifiés**

```bash
grep -r 'style="' src/app/features/auth/ src/app/features/onboarding/
```

Expected: aucune sortie.

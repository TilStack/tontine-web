# Auth + Onboarding — Design Spec (Sub-project 2)

**Date :** 2026-05-15  
**Périmètre :** Styling pass sur 5 pages existantes — toute la logique TypeScript est déjà en place.  
**Objectif :** Appliquer le Design System Foundation (tokens, mixins, classes utilitaires) aux pages auth et onboarding via SCSS pur — zéro inline style.

---

## Contraintes globales

- Pages centrées, **sans sidebar** (layout distinct du shell applicatif)
- Tokens du Design System Foundation uniquement (`var(--color-*)`, `var(--space-*)`, etc.)
- Mobile first — card pleine largeur sur mobile, `max-width: 420px` centrée sur desktop
- Palette indigo/ambre validée (`--color-primary` / `--color-accent`)
- Typographie Plus Jakarta Sans via `--font-family`
- **Zéro inline style** dans les templates HTML

---

## Architecture

### AuthLayoutComponent (nouveau composant partagé)

Shell de layout commun aux 5 pages. Projette le contenu via `<ng-content />`.  
Cohérent avec le pattern `AppShellComponent` pour les pages authentifiées.

**Chemin :** `src/app/features/auth/auth-layout/`

#### Template (`auth-layout.component.html`)

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

#### SCSS (`auth-layout.component.scss`)

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

#### TypeScript (`auth-layout.component.ts`)

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

#### Spec (`auth-layout.component.spec.ts`)

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

---

## Ajouts `_utilities.scss`

Fichier : `src/app/core/styles/_utilities.scss`

Ces classes utilitaires sont ajoutées une fois et réutilisées sur toutes les pages du sous-projet.

### `.link-primary` — lien de navigation

```scss
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
```

Rationale : l'ambre est réservé aux CTA — deux éléments ambre sur la même page créent une compétition visuelle. L'indigo primaire est la couleur logique pour la navigation.

### `.btn-primary` — bouton CTA pleine largeur

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
}
```

Rationale : `display: flex` requis pour centrer le `mat-progress-spinner` intérieur. `&:hover:not(:disabled)` évite l'effet hover sur un bouton désactivé. Pleine largeur = cible de tap maximale sur Android (Wave, MTN MoMo, Orange Money — standard fintech mobile camerounais).

### Bandeaux d'alerte — placeholder + 3 variantes

```scss
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
  color: #064e3b; /* var(--color-success) = #10b981 → ratio 3.0:1 insuffisant WCAG AA */
}
```

Rationale : `%alert-base` placeholder SCSS — génère zéro CSS seul, zéro duplication dans le bundle compilé. `#064e3b` sur fond `rgba(16,185,129,0.08)` atteint ~8:1 (WCAG AA pour texte normal 14px/500).

---

## Patron SCSS commun aux pages avec formulaire

Appliqué dans le `.scss` de chaque page contenant un `<form>` :

```scss
form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

mat-form-field { width: 100%; }

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

---

## Pages individuelles

### 1. Login — `/auth/login`

**Fichiers touchés :**
- Modifier : `src/app/features/auth/login/login.component.html`
- Créer : `src/app/features/auth/login/login.component.scss`
- Modifier : `src/app/features/auth/login/login.component.ts` (ajouter import `AuthLayoutComponent`)

**Template :**

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

**SCSS spécifique :**

```scss
h3 { margin-bottom: var(--space-2); }
```

(+ patron commun formulaire)

---

### 2. Reset Password — `/auth/reset-password`

**Fichiers touchés :**
- Modifier : `src/app/features/auth/reset-password/reset-password.component.html`
- Créer : `src/app/features/auth/reset-password/reset-password.component.scss`
- Modifier : `src/app/features/auth/reset-password/reset-password.component.ts` (import `AuthLayoutComponent`)

**Template :**

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
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Confirmer le mot de passe</mat-label>
      <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
    </mat-form-field>

    @if (error()) {
      <div class="alert-error" role="alert">{{ error() }}</div>
    }

    <button class="btn-primary" type="submit" [disabled]="loading()">
      @if (loading()) {
        <mat-progress-spinner diameter="20" mode="indeterminate" />
      } @else {
        Valider
      }
    </button>
  </form>
</app-auth-layout>
```

Note : pas de lien retour — flux forcé après invitation.

**SCSS spécifique :** patron commun formulaire uniquement.

---

### 3. Accept Invitation — `/auth/accept-invitation`

**Fichiers touchés :**
- Modifier : `src/app/features/auth/accept-invitation/accept-invitation.component.html`
- Créer : `src/app/features/auth/accept-invitation/accept-invitation.component.scss`
- Modifier : `src/app/features/auth/accept-invitation/accept-invitation.component.ts` (import `AuthLayoutComponent`)

**Template — 3 états :**

```html
<app-auth-layout>
  @if (validToken() === null) {
    <p class="body-text loading-state">Vérification du lien…</p>
  }

  @if (validToken() === false) {
    <h3 class="h3">Lien invalide</h3>
    <p class="body-text page-intro">
      Ce lien d'invitation est expiré ou invalide. Contactez votre administrateur.
    </p>
    <a class="link-primary" routerLink="/auth/login">Retour à la connexion</a>
  }

  @if (validToken() === true) {
    <h3 class="h3">Créer votre compte</h3>
    <p class="body-text page-intro">
      Invitation envoyée à <strong>{{ invitationEmail() }}</strong>.
    </p>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Nom complet</mat-label>
        <input matInput formControlName="name" autocomplete="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mot de passe</mat-label>
        <input matInput type="password" formControlName="password" autocomplete="new-password" />
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

**SCSS spécifique :**

```scss
.loading-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-8) 0;
}
```

(+ patron commun formulaire)

---

### 4. No Department — `/auth/no-department`

**Fichiers touchés :**
- Créer : `src/app/features/auth/no-department/no-department.component.html` (extrait du template inline `.ts`)
- Créer : `src/app/features/auth/no-department/no-department.component.scss`
- Modifier : `src/app/features/auth/no-department/no-department.component.ts` (passer à `templateUrl`, import `AuthLayoutComponent`)

**Template :**

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

Note : `mat-stroked-button` conservé — action secondaire (déconnexion), pas un CTA principal. Ne prend pas `.btn-primary` ambre.

**SCSS spécifique :**

```scss
.no-dept {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}
```

---

### 5. Request Department — `/onboarding/request`

**Fichiers touchés :**
- Modifier : `src/app/features/onboarding/request-department/request-department.component.html`
- Créer : `src/app/features/onboarding/request-department/request-department.component.scss`
- Modifier : `src/app/features/onboarding/request-department/request-department.component.ts` (import `AuthLayoutComponent`)

**Template — 2 états :**

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
        <mat-label>Nom complet</mat-label>
        <input matInput formControlName="name" autocomplete="name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput type="email" formControlName="email" autocomplete="email" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Département souhaité</mat-label>
        <input matInput formControlName="department" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Téléphone (optionnel)</mat-label>
        <input matInput type="tel" formControlName="phone" autocomplete="tel" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Message</mat-label>
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

**SCSS spécifique :**

```scss
.submitted {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
}
```

(+ patron commun formulaire)

---

## Accessibilité

- `role="alert"` sur tous les `.alert-error` — annonce immédiate aux lecteurs d'écran
- `.alert-success` : couleur `#064e3b` (~8:1 sur fond rgba) — WCAG AA conforme pour texte 14px/500
- `autocomplete` sur tous les champs de formulaire — réduit la saisie sur mobile
- `height: 48px` sur `.btn-primary` — cible de tap > 44px recommandée par iOS HIG / Material

---

## Fichiers créés / modifiés — récapitulatif

| Action | Fichier |
|--------|---------|
| Créer | `src/app/features/auth/auth-layout/auth-layout.component.ts` |
| Créer | `src/app/features/auth/auth-layout/auth-layout.component.html` |
| Créer | `src/app/features/auth/auth-layout/auth-layout.component.scss` |
| Créer | `src/app/features/auth/auth-layout/auth-layout.component.spec.ts` |
| Modifier | `src/app/core/styles/_utilities.scss` |
| Modifier | `src/app/features/auth/login/login.component.html` |
| Créer | `src/app/features/auth/login/login.component.scss` |
| Modifier | `src/app/features/auth/login/login.component.ts` |
| Modifier | `src/app/features/auth/reset-password/reset-password.component.html` |
| Créer | `src/app/features/auth/reset-password/reset-password.component.scss` |
| Modifier | `src/app/features/auth/reset-password/reset-password.component.ts` |
| Modifier | `src/app/features/auth/accept-invitation/accept-invitation.component.html` |
| Créer | `src/app/features/auth/accept-invitation/accept-invitation.component.scss` |
| Modifier | `src/app/features/auth/accept-invitation/accept-invitation.component.ts` |
| Créer | `src/app/features/auth/no-department/no-department.component.html` |
| Créer | `src/app/features/auth/no-department/no-department.component.scss` |
| Modifier | `src/app/features/auth/no-department/no-department.component.ts` |
| Modifier | `src/app/features/onboarding/request-department/request-department.component.html` |
| Créer | `src/app/features/onboarding/request-department/request-department.component.scss` |
| Modifier | `src/app/features/onboarding/request-department/request-department.component.ts` |

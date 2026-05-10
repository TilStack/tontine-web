# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser la fondation visuelle partagée — tokens CSS, thème Angular Material M3, typographie, utilitaires et pipe FCFA — que les 4 autres sous-projets UI importent sans rien redéfinir.

**Architecture:** CSS custom properties dans des partials SCSS (`_tokens`, `_typography`, `_utilities`, `_mixins`) + thème Angular Material M3 avec `mat.$violet-palette` (primary) et `mat.$orange-palette` (tertiary) + `FcfaPipe` Angular standalone testé en TDD.

**Tech Stack:** Angular 20, Angular Material M3 (v20.2.14), jest-preset-angular, SCSS, Google Fonts (Plus Jakarta Sans)

---

## Fichiers touchés

| Action   | Chemin                                       |
|----------|----------------------------------------------|
| Créer    | `src/app/core/pipes/fcfa.pipe.spec.ts`       |
| Créer    | `src/app/core/pipes/fcfa.pipe.ts`            |
| Créer    | `src/app/core/styles/_tokens.scss`           |
| Créer    | `src/app/core/styles/_typography.scss`       |
| Créer    | `src/app/core/styles/_utilities.scss`        |
| Créer    | `src/app/core/styles/_mixins.scss`           |
| Modifier | `angular.json`                               |
| Modifier | `src/index.html`                             |
| Modifier | `src/styles.scss`                            |

---

## Task 1 : FcfaPipe (TDD)

**Files:**
- Create: `src/app/core/pipes/fcfa.pipe.spec.ts`
- Create: `src/app/core/pipes/fcfa.pipe.ts`

- [ ] **Step 1 : Créer le dossier pipes**

```bash
mkdir -p src/app/core/pipes
```

- [ ] **Step 2 : Écrire le fichier de test (spec d'abord)**

Crée `src/app/core/pipes/fcfa.pipe.spec.ts` avec ce contenu exact :

```typescript
import { FcfaPipe } from './fcfa.pipe';

describe('FcfaPipe', () => {
  let pipe: FcfaPipe;

  beforeEach(() => {
    pipe = new FcfaPipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('retourne "— FCFA" pour null', () => {
    expect(pipe.transform(null)).toBe('— FCFA');
  });

  it('retourne "— FCFA" pour undefined', () => {
    expect(pipe.transform(undefined)).toBe('— FCFA');
  });

  it('retourne "0 FCFA" pour 0', () => {
    expect(pipe.transform(0)).toBe('0 FCFA');
  });

  it('formate 15000 en "15 000 FCFA" (séparateur insécable)', () => {
    const result = pipe.transform(15000);
    // fr-FR utilise   (narrow no-break space) ou   (no-break space)
    // on normalise pour la comparaison
    const normalized = result.replace(/ | /g, ' ');
    expect(normalized).toBe('15 000 FCFA');
  });

  it('formate -15000 en "-15 000 FCFA" (montant négatif)', () => {
    const result = pipe.transform(-15000);
    const normalized = result.replace(/ | /g, ' ');
    expect(normalized).toBe('-15 000 FCFA');
  });

  it('formate 1500000 en "1 500 000 FCFA" (millions)', () => {
    const result = pipe.transform(1500000);
    const normalized = result.replace(/ | /g, ' ');
    expect(normalized).toBe('1 500 000 FCFA');
  });
});
```

- [ ] **Step 3 : Vérifier que le test échoue (FcfaPipe n'existe pas encore)**

```bash
npx jest src/app/core/pipes/fcfa.pipe.spec.ts --no-coverage
```

Attendu : `FAIL` avec `Cannot find module './fcfa.pipe'`

- [ ] **Step 4 : Créer le pipe**

Crée `src/app/core/pipes/fcfa.pipe.ts` :

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    useGrouping: true,
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '— FCFA';
    const abs = this.formatter.format(Math.abs(value));
    const prefix = value < 0 ? '-' : '';
    return `${prefix}${abs} FCFA`;
  }
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

```bash
npx jest src/app/core/pipes/fcfa.pipe.spec.ts --no-coverage
```

Attendu :
```
PASS src/app/core/pipes/fcfa.pipe.spec.ts
  FcfaPipe
    ✓ should create an instance
    ✓ retourne "— FCFA" pour null
    ✓ retourne "— FCFA" pour undefined
    ✓ retourne "0 FCFA" pour 0
    ✓ formate 15000 en "15 000 FCFA" (séparateur insécable)
    ✓ formate -15000 en "-15 000 FCFA" (montant négatif)
    ✓ formate 1500000 en "1 500 000 FCFA" (millions)

Tests: 7 passed, 7 total
```

- [ ] **Step 6 : Commit**

```bash
git add src/app/core/pipes/fcfa.pipe.ts src/app/core/pipes/fcfa.pipe.spec.ts
git commit -m "feat(design-system): add FcfaPipe with FCFA number formatting"
```

---

## Task 2 : Partials SCSS

**Files:**
- Create: `src/app/core/styles/_tokens.scss`
- Create: `src/app/core/styles/_typography.scss`
- Create: `src/app/core/styles/_utilities.scss`
- Create: `src/app/core/styles/_mixins.scss`

- [ ] **Step 1 : Créer le dossier**

```bash
mkdir -p src/app/core/styles
```

- [ ] **Step 2 : Créer `_tokens.scss`**

Crée `src/app/core/styles/_tokens.scss` :

```scss
:root {
  /* Couleurs */
  --color-primary:        #1e1b4b; /* indigo dark — sidebar, headers */
  --color-primary-light:  #3730a3; /* indigo medium — hover states */
  --color-accent:         #f59e0b; /* ambre — CTA principaux */
  --color-accent-hover:   #d97706; /* ambre foncé — hover CTA */
  --color-success:        #10b981; /* vert — payé, confirmé */
  --color-warning:        #f97316; /* orange — retard, alerte */
  --color-error:          #ef4444; /* rouge — pénalité, erreur */
  --color-surface:        #ffffff; /* fond cartes */
  --color-background:     #f8fafc; /* fond général app */
  --color-text-primary:   #1e293b; /* texte principal */
  --color-text-secondary: #64748b; /* texte secondaire, labels */
  --color-border:         #e2e8f0; /* bordures, dividers */

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* Spacing (base 4px) */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Typographie */
  --font-family:    'Plus Jakarta Sans', sans-serif;
  --font-size-xs:   12px;
  --font-size-sm:   14px;
  --font-size-base: 16px;
  --font-size-lg:   18px;
  --font-size-xl:   22px;
  --font-size-2xl:  28px;
  --font-size-3xl:  36px;

  /* Ombres */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.10);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

  /* Sidebar */
  --sidebar-width:     240px;
  --sidebar-collapsed: 64px;
  --sidebar-bg:        #1e1b4b;
  --sidebar-text:      #e2e8f0;
  --sidebar-accent:    #f59e0b;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
}
```

- [ ] **Step 3 : Créer `_typography.scss`**

Crée `src/app/core/styles/_typography.scss` :

```scss
.h1 {
  font-family: var(--font-family);
  font-size: clamp(var(--font-size-2xl), 4vw, var(--font-size-3xl));
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
}

.h2 {
  font-family: var(--font-family);
  font-size: clamp(var(--font-size-xl), 3vw, 28px);
  font-weight: 700;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.h3 {
  font-family: var(--font-family);
  font-size: clamp(var(--font-size-lg), 2.5vw, var(--font-size-xl));
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.body-text {
  font-family: var(--font-family);
  font-size: clamp(var(--font-size-sm), 2vw, var(--font-size-base));
  font-weight: 400;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.caption {
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: 400;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.label-btn {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);
  font-weight: 600;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4 : Créer `_utilities.scss`**

Crée `src/app/core/styles/_utilities.scss` :

```scss
.text-fcfa {
  color: var(--color-accent);
  font-weight: 600;
}

.badge-success {
  background: var(--color-success);
  color: #ffffff;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.badge-warning {
  background: var(--color-warning);
  color: #ffffff;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.badge-error {
  background: var(--color-error);
  color: #ffffff;
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-4);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
}
```

- [ ] **Step 5 : Créer `_mixins.scss`**

Crée `src/app/core/styles/_mixins.scss` :

```scss
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@mixin truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@mixin mobile {
  @media (max-width: 767px) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: 768px) {
    @content;
  }
}

@mixin card-hover {
  transition: box-shadow var(--transition-fast);

  &:hover {
    box-shadow: var(--shadow-md);
  }
}
```

- [ ] **Step 6 : Commit**

```bash
git add src/app/core/styles/
git commit -m "feat(design-system): add SCSS partials (tokens, typography, utilities, mixins)"
```

---

## Task 3 : angular.json + Google Fonts

**Files:**
- Modify: `angular.json`
- Modify: `src/index.html`

- [ ] **Step 1 : Ajouter `stylePreprocessorOptions` dans `angular.json`**

Dans `angular.json`, trouve le bloc `projects.tontine-web.architect.build.options`.
Il contient actuellement `"styles": ["src/styles.scss"]`.
Ajoute `stylePreprocessorOptions` juste après `styles` :

```json
"styles": [
  "src/styles.scss"
],
"stylePreprocessorOptions": {
  "includePaths": [
    "src"
  ]
},
```

Ce réglage permet aux composants SCSS d'écrire `@use 'app/core/styles/mixins' as m`
au lieu d'un chemin relatif (`../../core/styles/mixins`).

- [ ] **Step 2 : Ajouter Google Fonts dans `src/index.html`**

Remplace le contenu de `src/index.html` par :

```html
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>TontineWeb</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

Note : `lang="fr"` remplace `lang="en"` — l'app est en français.

- [ ] **Step 3 : Vérifier que la build passe**

```bash
npx ng build --configuration=production 2>&1 | grep -E "ERROR|✔"
```

Attendu : `✔ Building...` sans aucune ligne `ERROR`.

- [ ] **Step 4 : Commit**

```bash
git add angular.json src/index.html
git commit -m "feat(design-system): add Google Fonts preconnect and stylePreprocessorOptions"
```

---

## Task 4 : styles.scss — thème M3 + styles globaux

**Files:**
- Modify: `src/styles.scss`

- [ ] **Step 1 : Remplacer le contenu de `src/styles.scss`**

Remplace tout le contenu de `src/styles.scss` par :

```scss
@use '@angular/material' as mat;

// Design system partials
// Les chemins sont relatifs à src/ grâce à stylePreprocessorOptions.includePaths
@use './app/core/styles/tokens';
@use './app/core/styles/typography';
@use './app/core/styles/utilities';

// Thème Angular Material M3
// mat.$violet-palette → indigo — composants primaires (boutons, checkboxes, progress)
// mat.$orange-palette → ambre  — composants tertiaires
html {
  @include mat.theme((
    color: (
      primary: mat.$violet-palette,
      tertiary: mat.$orange-palette,
    ),
    typography: 'Plus Jakarta Sans',
    density: 0,
  ));
}

// Reset global
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// Overrides Material : typographie + border-radius cohérents avec le design system
.mat-mdc-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button,
.mat-mdc-unelevated-button {
  font-family: var(--font-family) !important;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: var(--radius-md) !important;
}

.mat-mdc-card {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-sm) !important;
}

.mat-mdc-form-field {
  .mdc-notched-outline__leading {
    border-radius: var(--radius-md) 0 0 var(--radius-md) !important;
  }

  .mdc-notched-outline__trailing {
    border-radius: 0 var(--radius-md) var(--radius-md) 0 !important;
  }
}

.mat-mdc-dialog-container .mdc-dialog__surface {
  border-radius: var(--radius-xl) !important;
}

// Scrollbar discrète sur les navigateurs Webkit
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}
```

Note : `_mixins.scss` n'est pas importé dans `styles.scss` — les mixins ne génèrent pas de CSS par eux-mêmes. Les composants individuels l'importeront directement via `@use 'app/core/styles/mixins' as m`.

- [ ] **Step 2 : Vérifier la build production sans erreurs**

```bash
npx ng build --configuration=production 2>&1 | grep -E "ERROR|WARNING NG|✔"
```

Attendu : `✔ Building...` sans aucune ligne `ERROR` ni `WARNING NG`.

Si tu vois `Unresolved variable. mat.$violet-palette`, vérifie que tu es bien dans
`src/styles.scss` (pas dans un partial) et que l'import `@use '@angular/material' as mat`
est en première ligne.

- [ ] **Step 3 : Vérifier que tous les tests passent encore**

```bash
npx jest --passWithNoTests --no-coverage 2>&1 | tail -8
```

Attendu :
```
Test Suites: 18 passed, 18 total
Tests:       68 passed, 68 total
```

(17 suites existantes + 1 nouvelle pour FcfaPipe = 18 suites ; 61 + 7 = 68 tests)

- [ ] **Step 4 : Commit**

```bash
git add src/styles.scss
git commit -m "feat(design-system): configure Angular Material M3 theme with violet/orange palettes"
```

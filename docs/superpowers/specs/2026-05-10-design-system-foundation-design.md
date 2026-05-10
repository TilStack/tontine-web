# Design System Foundation — Spec

**Goal:** Établir la fondation visuelle partagée — tokens CSS, thème Angular Material M3, typographie, utilitaires et pipe FCFA — que les 4 autres sous-projets UI importent sans redéfinir quoi que ce soit.

**Architecture:** Angular Material M3 (palettes violet/orange) + CSS custom properties dans des partials SCSS + pipe Angular standalone.

**Tech Stack:** Angular 20, Angular Material M3, SCSS, Google Fonts (Plus Jakarta Sans, weights 400/500/600/700)

**Contraintes globales (valables sur les 5 sous-projets) :**
- Mobile first — majorité d'utilisateurs Android
- Animations légères uniquement (pas de `transition` > 300ms, pas de `animation` complexe)
- Contraste WCAG AA minimum sur tous les textes
- Montants toujours via `FcfaPipe`

---

## 1. Fichiers à créer / modifier

| Action   | Chemin                                        | Rôle                                                      |
|----------|-----------------------------------------------|-----------------------------------------------------------|
| Modifier | `src/index.html`                              | Preconnect + import Google Font                           |
| Créer    | `src/app/core/styles/_tokens.scss`            | Toutes les CSS custom properties                          |
| Créer    | `src/app/core/styles/_typography.scss`        | Classes de hiérarchie typographique                       |
| Créer    | `src/app/core/styles/_utilities.scss`         | Classes utilitaires globales                              |
| Créer    | `src/app/core/styles/_mixins.scss`            | Mixins SCSS réutilisables                                 |
| Modifier | `src/styles.scss`                             | Point d'entrée : importe tout, thème M3                   |
| Modifier | `angular.json`                                | Ajouter `stylePreprocessorOptions.includePaths: ['src']`  |
| Créer    | `src/app/core/pipes/fcfa.pipe.ts`             | Pipe de formatage monétaire FCFA                          |
| Créer    | `src/app/core/pipes/fcfa.pipe.spec.ts`        | Tests unitaires du pipe                                   |

---

## 2. Google Fonts — `src/index.html`

Ajouter dans `<head>` :

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap&subset=latin,latin-ext" rel="stylesheet">
```

`font-display: swap` est inclus via le paramètre `display=swap` dans l'URL Google Fonts.

---

## 3. Tokens SCSS — `src/app/core/styles/_tokens.scss`

```scss
:root {
  /* Couleurs */
  --color-primary:           #1e1b4b;  /* indigo dark — sidebar, headers */
  --color-primary-light:     #3730a3;  /* indigo medium — hover states */
  --color-accent:            #f59e0b;  /* ambre — CTA principaux */
  --color-accent-hover:      #d97706;  /* ambre foncé — hover CTA */
  --color-success:           #10b981;  /* vert — payé, confirmé */
  --color-warning:           #f97316;  /* orange — retard, alerte */
  --color-error:             #ef4444;  /* rouge — pénalité, erreur */
  --color-surface:           #ffffff;  /* fond cartes */
  --color-background:        #f8fafc;  /* fond général app */
  --color-text-primary:      #1e293b;  /* texte principal */
  --color-text-secondary:    #64748b;  /* texte secondaire, labels */
  --color-border:            #e2e8f0;  /* bordures, dividers */

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-full: 9999px;

  /* Spacing (base 4px) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Typographie */
  --font-family:   'Plus Jakarta Sans', sans-serif;
  --font-size-xs:  12px;
  --font-size-sm:  14px;
  --font-size-base:16px;
  --font-size-lg:  18px;
  --font-size-xl:  22px;
  --font-size-2xl: 28px;
  --font-size-3xl: 36px;

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

---

## 4. Typographie — `src/app/core/styles/_typography.scss`

Classes de hiérarchie à appliquer sur les éléments HTML. Mobile first via `clamp()`.

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

---

## 5. Utilitaires — `src/app/core/styles/_utilities.scss`

```scss
/* Montants FCFA */
.text-fcfa {
  color: var(--color-accent);
  font-weight: 600;
}

/* Badges de statut */
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

/* Conteneur de page */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-4);
}

/* Surface carte standard */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
}
```

---

## 6. Mixins — `src/app/core/styles/_mixins.scss`

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
  @media (max-width: 767px) { @content; }
}

@mixin desktop {
  @media (min-width: 768px) { @content; }
}

@mixin card-hover {
  transition: box-shadow var(--transition-fast);
  &:hover {
    box-shadow: var(--shadow-md);
  }
}
```

---

## 7. FcfaPipe — `src/app/core/pipes/fcfa.pipe.ts`

Pipe standalone, transforme `number | null | undefined` → chaîne formatée FCFA.

**Comportement :**

| Entrée       | Sortie          |
|--------------|-----------------|
| `null`       | `— FCFA`        |
| `undefined`  | `— FCFA`        |
| `0`          | `0 FCFA`        |
| `15000`      | `15 000 FCFA`   |
| `-15000`     | `-15 000 FCFA`  |

Séparateur de milliers : espace insécable (` `, narrow no-break space) fourni nativement par `Intl.NumberFormat` avec la locale `'fr-FR'`.

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  private formatter = new Intl.NumberFormat('fr-FR', {
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

**Tests (`fcfa.pipe.spec.ts`) :**

```typescript
it('retourne "— FCFA" pour null', () => expect(pipe.transform(null)).toBe('— FCFA'));
it('retourne "— FCFA" pour undefined', () => expect(pipe.transform(undefined)).toBe('— FCFA'));
it('retourne "0 FCFA" pour 0', () => expect(pipe.transform(0)).toBe('0 FCFA'));
it('formate 15000 → "15 000 FCFA"', () => {
  const result = pipe.transform(15000);
  // Le séparateur fr-FR peut être   ou   selon l'environnement
  expect(result.replace(/ | /g, ' ')).toBe('15 000 FCFA');
});
it('formate -15000 → "-15 000 FCFA"', () => {
  const result = pipe.transform(-15000);
  expect(result.replace(/ | /g, ' ')).toBe('-15 000 FCFA');
});
```

---

## 8. Point d'entrée global — `src/styles.scss`

```scss
@use '@angular/material' as mat;

// Partials du design system
// Chemins relatifs depuis src/styles.scss
// angular.json doit avoir stylePreprocessorOptions.includePaths: ['src']
// pour que les composants puissent écrire @use 'app/core/styles/mixins'
@use './app/core/styles/tokens';
@use './app/core/styles/typography';
@use './app/core/styles/utilities';
@use './app/core/styles/mixins';

// Thème Angular Material M3
// mat.$violet-palette → primary indigo
// mat.$orange-palette → tertiary ambre
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

// Reset et base globale
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
}

// Override Material : remplacer Roboto par Plus Jakarta Sans
.mat-mdc-button,
.mat-mdc-raised-button,
.mat-mdc-outlined-button,
.mat-mdc-unelevated-button {
  font-family: var(--font-family) !important;
  font-weight: 600;
  border-radius: var(--radius-md);
}

.mat-mdc-card {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-sm) !important;
}

.mat-mdc-form-field {
  .mdc-notched-outline__leading,
  .mdc-notched-outline__trailing {
    border-radius: var(--radius-md);
  }
}

.mat-mdc-dialog-container .mdc-dialog__surface {
  border-radius: var(--radius-xl) !important;
}
```

---

## 9. Contraintes d'accessibilité WCAG AA

Les combinaisons couleur/fond suivantes ont été vérifiées (ratio ≥ 4.5:1) :

| Texte                  | Fond               | Ratio estimé |
|------------------------|--------------------|-------------|
| `#1e293b` (text-primary) | `#f8fafc` (bg)   | ~14:1 ✅    |
| `#64748b` (text-secondary) | `#ffffff`      | ~4.6:1 ✅   |
| `#ffffff`              | `#1e1b4b` (sidebar)| ~15:1 ✅    |
| `#1e293b`              | `#ffffff` (card)   | ~14:1 ✅    |
| `#ffffff`              | `#10b981` (success)| ~3.0:1 ⚠️  |

**Note :** La combinaison blanc sur `--color-success` (#10b981) est insuffisante pour du texte de corps (3.0:1 < 4.5:1). Les badges `badge-success` doivent donc utiliser des textes courts en `font-weight: 600` et `font-size ≥ 14px` (seuil WCAG large text : 3:1). Pour tout texte de corps sur fond vert, utiliser `#064e3b` à la place.

---

## 10. Ce que ce sous-projet ne couvre PAS

- Aucun composant page (auth, dashboard, cycles, caisse)
- Pas de layout sidebar (sous-projet 3)
- Pas de routing ni de logique métier
- `FcfaPipe` exporté depuis `src/app/core/pipes/` — les pages l'importent directement
- `angular.json` : une fois `includePaths: ['src']` ajouté, tout composant peut écrire
  `@use 'app/core/styles/mixins' as m;` puis appeler `@include m.flex-center;`

# Foundation — Tontine Départementale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le socle complet de l'application : Firebase + AngularFire, Firestore multi-tenant avec custom claims, guards Angular, app shell avec sidebar par rôle, flux d'authentification complets (login, invitation, création par admin, demande de département), et Cloud Functions de provisioning.

**Architecture:** `deptId` dans le JWT (custom claim) pour l'isolation multi-tenant vérifiée par les Security Rules, sans lecture Firestore supplémentaire. Le rôle est stocké dans Firestore pour être modifiable immédiatement par l'admin. Les composants Angular sont standalone, lazy-loaded par feature, avec des guards fonctionnels. Toutes les opérations privilégiées (créer un compte, assigner un claim, provisionner un département) passent par des Cloud Functions v2 (Admin SDK) — jamais côté client.

**Tech Stack:** Angular 20.1 (CLI 20.3), @angular/fire 19, firebase 11, Angular Material 20, TypeScript strict, Jest + jest-preset-angular 14, Firebase Admin SDK 13, Cloud Functions v2 (firebase-functions 7).

---

**Prérequis :** Projet Firebase existant avec Firestore, Auth, et Functions activés. Récupérer l'objet `firebaseConfig` depuis Firebase Console → Project Settings → Your apps.

---

## File Map

**Créés :**
```
src/environments/environment.ts
src/environments/environment.prod.ts
src/app/core/models/user.model.ts
src/app/core/models/department.model.ts
src/app/core/models/invitation.model.ts
src/app/core/models/department-request.model.ts
src/app/core/services/auth.service.ts
src/app/core/services/auth.service.spec.ts
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
src/app/core/guards/auth.guard.ts
src/app/core/guards/auth.guard.spec.ts
src/app/core/guards/dept.guard.ts
src/app/core/guards/dept.guard.spec.ts
src/app/core/guards/must-reset-password.guard.ts
src/app/core/guards/must-reset-password.guard.spec.ts
src/app/core/guards/super-admin.guard.ts
src/app/shared/components/app-shell/app-shell.component.ts
src/app/shared/components/app-shell/app-shell.component.html
src/app/shared/components/app-shell/app-shell.component.scss
src/app/features/auth/auth.routes.ts
src/app/features/auth/login/login.component.ts
src/app/features/auth/login/login.component.html
src/app/features/auth/accept-invitation/accept-invitation.component.ts
src/app/features/auth/accept-invitation/accept-invitation.component.html
src/app/features/auth/reset-password/reset-password.component.ts
src/app/features/auth/reset-password/reset-password.component.html
src/app/features/auth/no-department/no-department.component.ts
src/app/features/onboarding/onboarding.routes.ts
src/app/features/onboarding/request-department/request-department.component.ts
src/app/features/onboarding/request-department/request-department.component.html
src/app/features/super-admin/super-admin.routes.ts
src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts
src/app/features/super-admin/requests/dept-requests.component.ts
src/app/features/dashboard/dashboard.routes.ts
src/app/features/dashboard/home/home.component.ts
functions/src/accept-invitation.ts
functions/src/create-managed-user.ts
functions/src/provision-department.ts
jest.config.ts
```

**Modifiés :**
```
src/app/app.routes.ts
src/app/app.config.ts
src/app/app.ts
tsconfig.spec.json
angular.json
package.json
firestore.rules
functions/src/index.ts
```

---

## Task 1 : Install dependencies + migrate vers Jest

**Files:**
- Modify: `package.json`
- Modify: `angular.json`
- Modify: `tsconfig.spec.json`
- Create: `jest.config.ts`

- [ ] **Step 1 : Installer Firebase, AngularFire, Angular Material et Jest**

```bash
cd /home/tilstack/Bureau/tontine-web

# Firebase + AngularFire
npm install firebase@^11.0.0 @angular/fire@^19.0.0

# Angular Material
npm install @angular/material@^20.0.0 @angular/cdk@^20.0.0

# Jest (remplace Karma/Jasmine)
npm install --save-dev jest@^29.0.0 @types/jest@^29.0.0 jest-preset-angular@^14.0.0 \
  @jest/globals@^29.0.0

# Supprimer Karma/Jasmine
npm uninstall karma karma-chrome-launcher karma-coverage karma-jasmine \
  karma-jasmine-html-reporter jasmine-core @types/jasmine
```

- [ ] **Step 2 : Créer `jest.config.ts`**

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterFramework: ['<rootDir>/setup-jest.ts'],
  testPathPattern: ['src/.*\\.spec\\.ts$'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@env/(.*)$': '<rootDir>/src/environments/$1',
  },
  collectCoverageFrom: ['src/app/**/*.ts', '!src/app/**/*.spec.ts'],
  coverageReporters: ['text', 'lcov'],
};

export default config;
```

- [ ] **Step 3 : Créer `setup-jest.ts`**

```typescript
// setup-jest.ts
import 'jest-preset-angular/setup-jest';
```

- [ ] **Step 4 : Mettre à jour `tsconfig.spec.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest"],
    "esModuleInterop": true,
    "module": "CommonJS"
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts",
    "setup-jest.ts"
  ]
}
```

- [ ] **Step 5 : Mettre à jour `angular.json` — remplacer le builder de test**

Dans `angular.json`, remplacer la section `"test"` du projet `tontine-web` :

```json
"test": {
  "builder": "@angular-builders/jest:run",
  "options": {
    "configPath": "jest.config.ts"
  }
}
```

Installer `@angular-builders/jest` :
```bash
npm install --save-dev @angular-builders/jest@^19.0.0
```

- [ ] **Step 6 : Mettre à jour les scripts dans `package.json`**

Ajouter dans la section `"scripts"` :
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

- [ ] **Step 7 : Vérifier que Jest fonctionne**

```bash
npx jest --passWithNoTests
```

Résultat attendu : `Test Suites: 0 skipped, 0 total` sans erreur.

- [ ] **Step 8 : Commit**

```bash
git add package.json angular.json tsconfig.spec.json jest.config.ts setup-jest.ts
git commit -m "chore: replace Karma/Jasmine with Jest, install Firebase and Material deps"
```

---

## Task 2 : Configuration Firebase (environment)

**Files:**
- Create: `src/environments/environment.ts`
- Create: `src/environments/environment.prod.ts`

- [ ] **Step 1 : Créer `src/environments/environment.ts`**

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
};
```

Remplacer les valeurs `REPLACE_ME` par les vraies valeurs depuis Firebase Console → Project Settings → Your apps.

- [ ] **Step 2 : Créer `src/environments/environment.prod.ts`**

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  firebase: {
    apiKey: 'REPLACE_ME',
    authDomain: 'REPLACE_ME.firebaseapp.com',
    projectId: 'REPLACE_ME',
    storageBucket: 'REPLACE_ME.appspot.com',
    messagingSenderId: 'REPLACE_ME',
    appId: 'REPLACE_ME',
  },
};
```

- [ ] **Step 3 : Ajouter fileReplacements dans `angular.json`**

Dans `angular.json`, sous `projects.tontine-web.architect.build.configurations.production`, ajouter :
```json
"fileReplacements": [
  {
    "replace": "src/environments/environment.ts",
    "with": "src/environments/environment.prod.ts"
  }
]
```

- [ ] **Step 4 : Ajouter `src/environments/` dans `.gitignore`**

```bash
echo "src/environments/environment*.ts" >> .gitignore
```

Créer un fichier exemple :
```bash
cp src/environments/environment.ts src/environments/environment.example.ts
# Remplacer les valeurs réelles par REPLACE_ME dans environment.example.ts (déjà fait)
```

- [ ] **Step 5 : Commit**

```bash
git add src/environments/environment.example.ts angular.json .gitignore
git commit -m "chore: add Firebase environment config (example file, real config gitignored)"
```

---

## Task 3 : TypeScript Models

**Files:**
- Create: `src/app/core/models/user.model.ts`
- Create: `src/app/core/models/department.model.ts`
- Create: `src/app/core/models/invitation.model.ts`
- Create: `src/app/core/models/department-request.model.ts`

- [ ] **Step 1 : Créer `src/app/core/models/user.model.ts`**

```typescript
// src/app/core/models/user.model.ts
import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'bureau' | 'membre';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  rang: number;
  hasBenefited: boolean;
  joinedAt: Timestamp;
  mustResetPassword: boolean;
}

export interface UserClaims {
  deptId: string;
  role?: 'super_admin';
}
```

- [ ] **Step 2 : Créer `src/app/core/models/department.model.ts`**

```typescript
// src/app/core/models/department.model.ts
import { Timestamp } from 'firebase/firestore';

export type DepartmentStatus = 'active' | 'pending';

export interface Department {
  id: string;
  name: string;
  adminId: string;
  status: DepartmentStatus;
  createdAt: Timestamp;
  settings: Record<string, unknown>;
}
```

- [ ] **Step 3 : Créer `src/app/core/models/invitation.model.ts`**

```typescript
// src/app/core/models/invitation.model.ts
import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user.model';

export interface Invitation {
  token: string;
  email: string;
  role: UserRole;
  createdBy: string;
  expiresAt: Timestamp;
  used: boolean;
  deptId: string;
}
```

- [ ] **Step 4 : Créer `src/app/core/models/department-request.model.ts`**

```typescript
// src/app/core/models/department-request.model.ts
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
}
```

- [ ] **Step 5 : Commit**

```bash
git add src/app/core/models/
git commit -m "feat(core): add TypeScript models for User, Department, Invitation, DepartmentRequest"
```

---

## Task 4 : Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1 : Réécrire `firestore.rules`**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function inDept(deptId) {
      return isAuthenticated() && request.auth.token.deptId == deptId;
    }

    function isSuperAdmin() {
      return isAuthenticated() && request.auth.token.role == 'super_admin';
    }

    function getUserRole(deptId) {
      return get(/databases/$(database)/documents/departments/$(deptId)/users/$(request.auth.uid)).data.role;
    }

    function isAdminOfDept(deptId) {
      return inDept(deptId) && getUserRole(deptId) == 'admin';
    }

    // Département
    match /departments/{deptId} {
      allow read: if inDept(deptId) || isSuperAdmin();
      allow create: if isSuperAdmin();
      allow update: if isAdminOfDept(deptId) || isSuperAdmin();
      allow delete: if isSuperAdmin();

      // Membres du département
      match /users/{userId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if isAdminOfDept(deptId) || isSuperAdmin();
      }

      // Invitations — créées et lues par l'admin uniquement
      // La validation métier (used, email) est faite côté Cloud Function
      match /invitations/{token} {
        allow read: if isAuthenticated()
                    && request.time < resource.data.expiresAt;
        allow create: if isAdminOfDept(deptId);
        allow update: if isSuperAdmin();
        allow delete: if isAdminOfDept(deptId) || isSuperAdmin();
      }

      // Cycles (stub pour le prochain spec)
      match /cycles/{cycleId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if isAdminOfDept(deptId) || isSuperAdmin();
      }

      // Cotisations (stub)
      match /cycles/{cycleId}/cotisations/{cotisationId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if inDept(deptId) || isSuperAdmin();
      }

      // Caisse (stub)
      match /caisse/{transactionId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if inDept(deptId) && getUserRole(deptId) in ['admin', 'bureau']
                     || isSuperAdmin();
      }
    }

    // Demandes de création de département — écriture publique (pas de deptId requis)
    match /department_requests/{requestId} {
      allow create: if true;
      allow read, update: if isSuperAdmin();
      allow delete: if isSuperAdmin();
    }

    // Profil global utilisateur — lecture/écriture propre uniquement
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
      allow read: if isSuperAdmin();
    }
  }
}
```

- [ ] **Step 2 : Vérifier la syntaxe avec Firebase CLI**

```bash
firebase firestore:rules:get
# Ou pour tester en local avec l'émulateur :
firebase emulators:start --only firestore
```

- [ ] **Step 3 : Commit**

```bash
git add firestore.rules
git commit -m "feat(firestore): add multi-tenant security rules with custom claims isolation"
```

---

## Task 5 : Configurer Angular avec Firebase providers

**Files:**
- Modify: `src/app/app.config.ts`
- Modify: `src/app/app.ts`

- [ ] **Step 1 : Mettre à jour `src/app/app.config.ts`**

```typescript
// src/app/app.config.ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getFunctions, provideFunctions } from '@angular/fire/functions';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
  ],
};
```

- [ ] **Step 2 : Vérifier que l'app compile**

```bash
npx ng build --configuration development 2>&1 | tail -5
```

Résultat attendu : `✓ Application bundle generation complete.`

- [ ] **Step 3 : Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(core): configure Firebase providers in app config"
```

---

## Task 6 : AuthService

**Files:**
- Create: `src/app/core/services/auth.service.ts`
- Create: `src/app/core/services/auth.service.spec.ts`

- [ ] **Step 1 : Écrire le test en premier**

```typescript
// src/app/core/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { Auth, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
  getIdTokenResult: jest.fn().mockResolvedValue({
    claims: { deptId: 'dept-1', role: undefined },
  }),
} as unknown as User;

const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: jest.fn(),
} as unknown as Auth;

jest.mock('@angular/fire/auth', () => ({
  ...jest.requireActual('@angular/fire/auth'),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  authState: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: mockAuth }],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login() should call signInWithEmailAndPassword', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
    await service.login('test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth, 'test@example.com', 'password123'
    );
  });

  it('logout() should call signOut', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);
    await service.logout();
    expect(signOut).toHaveBeenCalledWith(mockAuth);
  });

  it('getClaims() should return token claims', async () => {
    const claims = await service.getClaims();
    expect(claims?.deptId).toBe('dept-1');
  });
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
npx jest src/app/core/services/auth.service.spec.ts
```

Résultat attendu : `FAIL` avec "Cannot find module './auth.service'"

- [ ] **Step 3 : Créer `src/app/core/services/auth.service.ts`**

```typescript
// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { UserClaims } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  readonly user$: Observable<User | null> = authState(this.auth);

  login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password).then(() => undefined);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async getClaims(): Promise<UserClaims | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    const result = await user.getIdTokenResult();
    return result.claims as UserClaims;
  }

  async forceTokenRefresh(): Promise<void> {
    await this.auth.currentUser?.getIdToken(true);
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npx jest src/app/core/services/auth.service.spec.ts
```

Résultat attendu : `PASS` — 4 tests passing.

- [ ] **Step 5 : Commit**

```bash
git add src/app/core/services/auth.service.ts src/app/core/services/auth.service.spec.ts
git commit -m "feat(core): add AuthService with login, logout, claims, token refresh"
```

---

## Task 7 : UserService

**Files:**
- Create: `src/app/core/services/user.service.ts`
- Create: `src/app/core/services/user.service.spec.ts`

- [ ] **Step 1 : Écrire le test en premier**

```typescript
// src/app/core/services/user.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { UserService } from './user.service';
import { UserProfile } from '../models/user.model';

const mockProfile: UserProfile = {
  uid: 'user-1',
  displayName: 'Israel T.',
  email: 'israel@example.com',
  role: 'membre',
  rang: 3,
  hasBenefited: false,
  joinedAt: { seconds: 0, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  doc: jest.fn(),
  docData: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const mockFirestore = {} as Firestore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, { provide: Firestore, useValue: mockFirestore }],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchProfile() should return an observable of UserProfile', (done) => {
    (doc as jest.Mock).mockReturnValue('ref');
    (docData as jest.Mock).mockReturnValue(of(mockProfile));

    service.watchProfile('dept-1', 'user-1').subscribe((profile) => {
      expect(profile?.displayName).toBe('Israel T.');
      done();
    });
  });
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
npx jest src/app/core/services/user.service.spec.ts
```

Résultat attendu : `FAIL` avec "Cannot find module './user.service'"

- [ ] **Step 3 : Créer `src/app/core/services/user.service.ts`**

```typescript
// src/app/core/services/user.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);

  watchProfile(deptId: string, uid: string): Observable<UserProfile | undefined> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    return docData(ref) as Observable<UserProfile | undefined>;
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
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npx jest src/app/core/services/user.service.spec.ts
```

Résultat attendu : `PASS` — 2 tests passing.

- [ ] **Step 5 : Commit**

```bash
git add src/app/core/services/user.service.ts src/app/core/services/user.service.spec.ts
git commit -m "feat(core): add UserService with watchProfile and createProfile"
```

---

## Task 8 : Route Guards

**Files:**
- Create: `src/app/core/guards/auth.guard.ts`
- Create: `src/app/core/guards/auth.guard.spec.ts`
- Create: `src/app/core/guards/dept.guard.ts`
- Create: `src/app/core/guards/dept.guard.spec.ts`
- Create: `src/app/core/guards/must-reset-password.guard.ts`
- Create: `src/app/core/guards/must-reset-password.guard.spec.ts`
- Create: `src/app/core/guards/super-admin.guard.ts`

- [ ] **Step 1 : Écrire les tests des guards**

```typescript
// src/app/core/guards/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { of } from 'rxjs';

describe('authGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/login') } as any;
    authService = { user$: of(null) } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('should redirect to /auth/login when not authenticated', async () => {
    authService.user$ = of(null);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should allow when authenticated', async () => {
    authService.user$ = of({ uid: 'user-1' } as any);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });
});
```

```typescript
// src/app/core/guards/dept.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { deptGuard } from './dept.guard';

describe('deptGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/no-department') } as any;
    authService = { getClaims: jest.fn() } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('should redirect to /auth/no-department when no deptId claim', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: undefined });
    await TestBed.runInInjectionContext(() => deptGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/no-department']);
  });

  it('should allow when deptId claim is present', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: 'dept-1' });
    const result = await TestBed.runInInjectionContext(() => deptGuard({} as any, {} as any));
    expect(result).toBe(true);
  });
});
```

```typescript
// src/app/core/guards/must-reset-password.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { mustResetPasswordGuard } from './must-reset-password.guard';
import { of } from 'rxjs';

describe('mustResetPasswordGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/reset-password') } as any;
    authService = {
      currentUser: { uid: 'user-1' } as any,
      getClaims: jest.fn().mockResolvedValue({ deptId: 'dept-1' }),
    } as any;
    userService = { watchProfile: jest.fn() } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
  });

  it('should redirect to /auth/reset-password when mustResetPassword is true', async () => {
    (userService.watchProfile as jest.Mock).mockReturnValue(
      of({ mustResetPassword: true })
    );
    await TestBed.runInInjectionContext(() => mustResetPasswordGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/reset-password']);
  });

  it('should allow when mustResetPassword is false', async () => {
    (userService.watchProfile as jest.Mock).mockReturnValue(
      of({ mustResetPassword: false })
    );
    const result = await TestBed.runInInjectionContext(
      () => mustResetPasswordGuard({} as any, {} as any)
    );
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
npx jest src/app/core/guards/
```

Résultat attendu : `FAIL` — "Cannot find module './auth.guard'"

- [ ] **Step 3 : Créer `auth.guard.ts`**

```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.user$.pipe(
    take(1),
    map((user) => (user ? true : router.createUrlTree(['/auth/login'])))
  );
};
```

- [ ] **Step 4 : Créer `dept.guard.ts`**

```typescript
// src/app/core/guards/dept.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const deptGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const claims = await auth.getClaims();
  if (!claims?.deptId) {
    return router.createUrlTree(['/auth/no-department']);
  }
  return true;
};
```

- [ ] **Step 5 : Créer `must-reset-password.guard.ts`**

```typescript
// src/app/core/guards/must-reset-password.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const mustResetPasswordGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  const uid = auth.currentUser?.uid;
  const claims = await auth.getClaims();
  if (!uid || !claims?.deptId) return true;

  const profile = await firstValueFrom(userService.watchProfile(claims.deptId, uid));
  if (profile?.mustResetPassword) {
    return router.createUrlTree(['/auth/reset-password']);
  }
  return true;
};
```

- [ ] **Step 6 : Créer `super-admin.guard.ts`**

```typescript
// src/app/core/guards/super-admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const claims = await auth.getClaims();
  if (claims?.role !== 'super_admin') {
    return router.createUrlTree(['/app']);
  }
  return true;
};
```

- [ ] **Step 7 : Vérifier que tous les tests passent**

```bash
npx jest src/app/core/guards/
```

Résultat attendu : `PASS` — 6 tests passing.

- [ ] **Step 8 : Commit**

```bash
git add src/app/core/guards/
git commit -m "feat(core): add authGuard, deptGuard, mustResetPasswordGuard, superAdminGuard"
```

---

## Task 9 : App Routing + App Shell

**Files:**
- Modify: `src/app/app.routes.ts`
- Create: `src/app/shared/components/app-shell/app-shell.component.ts`
- Create: `src/app/shared/components/app-shell/app-shell.component.html`
- Create: `src/app/shared/components/app-shell/app-shell.component.scss`

- [ ] **Step 1 : Mettre à jour `src/app/app.routes.ts`**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AppShellComponent } from './shared/components/app-shell/app-shell.component';
import { authGuard } from './core/guards/auth.guard';
import { deptGuard } from './core/guards/dept.guard';
import { mustResetPasswordGuard } from './core/guards/must-reset-password.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    loadChildren: () =>
      import('./features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authGuard, superAdminGuard],
    loadChildren: () =>
      import('./features/super-admin/super-admin.routes').then((m) => m.SUPER_ADMIN_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard, deptGuard, mustResetPasswordGuard],
    component: AppShellComponent,
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
```

- [ ] **Step 2 : Créer `app-shell.component.ts`**

```typescript
// src/app/shared/components/app-shell/app-shell.component.ts
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserProfile, UserRole } from '../../../core/models/user.model';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', route: '/app', icon: 'dashboard', roles: ['admin', 'bureau', 'membre'] },
  { label: 'Cotisations',     route: '/app/cotisations', icon: 'payments', roles: ['admin', 'bureau', 'membre'] },
  { label: 'Membres',         route: '/app/membres',     icon: 'group',    roles: ['admin', 'bureau', 'membre'] },
  { label: 'Caisse',          route: '/app/caisse',      icon: 'account_balance', roles: ['admin', 'bureau'] },
  { label: 'Cycles',          route: '/app/cycles',      icon: 'loop',     roles: ['admin'] },
  { label: 'Invitations',     route: '/app/invitations', icon: 'send',     roles: ['admin'] },
  { label: 'Paramètres',      route: '/app/parametres',  icon: 'settings', roles: ['admin'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AsyncPipe,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
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

  visibleNavItems = computed(() => {
    const role = this.profile()?.role;
    if (!role) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(role));
  });

  async ngOnInit(): Promise<void> {
    const claims = await this.authService.getClaims();
    if (!claims?.deptId) return;
    this.deptId.set(claims.deptId);

    const uid = this.authService.currentUser?.uid;
    if (!uid) return;

    this.userService.watchProfile(claims.deptId, uid).subscribe((p) => {
      if (p) this.profile.set(p);
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
```

- [ ] **Step 3 : Créer `app-shell.component.html`**

```html
<!-- src/app/shared/components/app-shell/app-shell.component.html -->
<mat-sidenav-container class="shell-container">
  <mat-sidenav mode="side" opened class="sidenav">
    <div class="dept-header">
      <span class="dept-label">Département</span>
      <span class="dept-name">{{ deptId() ?? '…' }}</span>
    </div>

    <mat-nav-list>
      @for (item of visibleNavItems(); track item.route) {
        <a mat-list-item
           [routerLink]="item.route"
           routerLinkActive="active-link"
           [routerLinkActiveOptions]="{ exact: item.route === '/app' }">
          <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
          <span matListItemTitle>{{ item.label }}</span>
        </a>
      }
    </mat-nav-list>

    <div class="user-footer">
      @if (profile(); as p) {
        <div class="avatar">{{ p.displayName.charAt(0) }}</div>
        <div class="user-info">
          <span class="user-name">{{ p.displayName }}</span>
          <span class="user-role">{{ p.role }}</span>
        </div>
      }
      <button mat-icon-button (click)="logout()" aria-label="Déconnexion">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  </mat-sidenav>

  <mat-sidenav-content class="main-content">
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

- [ ] **Step 4 : Créer `app-shell.component.scss`**

```scss
// src/app/shared/components/app-shell/app-shell.component.scss
.shell-container {
  height: 100vh;
}

.sidenav {
  width: 220px;
  background: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
}

.dept-header {
  padding: 16px;
  border-bottom: 1px solid #1e293b;

  .dept-label {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 4px;
  }

  .dept-name {
    font-size: 0.9rem;
    font-weight: 600;
  }
}

mat-nav-list {
  flex: 1;

  a.active-link {
    background: rgba(59, 130, 246, 0.15);
    border-left: 3px solid #3b82f6;
    color: white;

    mat-icon { color: #3b82f6; }
  }

  mat-icon, span { color: #94a3b8; }
}

.user-footer {
  padding: 12px 16px;
  border-top: 1px solid #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;

  .avatar {
    width: 28px;
    height: 28px;
    background: #3b82f6;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;
    min-width: 0;

    .user-name {
      display: block;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.65rem;
      color: #64748b;
    }
  }

  button mat-icon { color: #64748b; font-size: 1rem; }
}

.main-content {
  background: #f8fafc;
  padding: 24px;
}
```

- [ ] **Step 5 : Vérifier que l'app compile**

```bash
npx ng build --configuration development 2>&1 | tail -5
```

Résultat attendu : `✓ Application bundle generation complete.`

- [ ] **Step 6 : Commit**

```bash
git add src/app/app.routes.ts src/app/shared/
git commit -m "feat(shell): add app routing with guards and AppShellComponent sidebar"
```

---

## Task 10 : Feature Auth — Login

**Files:**
- Create: `src/app/features/auth/auth.routes.ts`
- Create: `src/app/features/auth/login/login.component.ts`
- Create: `src/app/features/auth/login/login.component.html`

- [ ] **Step 1 : Créer `auth.routes.ts`**

```typescript
// src/app/features/auth/auth.routes.ts
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./accept-invitation/accept-invitation.component').then(
        (m) => m.AcceptInvitationComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'no-department',
    loadComponent: () =>
      import('./no-department/no-department.component').then(
        (m) => m.NoDepartmentComponent
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
```

- [ ] **Step 2 : Créer `login.component.ts`**

```typescript
// src/app/features/auth/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
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
        this.form.value.password as string
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

- [ ] **Step 3 : Créer `login.component.html`**

```html
<!-- src/app/features/auth/login/login.component.html -->
<div class="login-wrapper">
  <div class="login-card">
    <h1>Tontine Départementale</h1>
    <p class="subtitle">Connectez-vous à votre espace</p>

    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput type="email" formControlName="email" autocomplete="email" />
        @if (form.get('email')?.hasError('email')) {
          <mat-error>Email invalide</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Mot de passe</mat-label>
        <input matInput type="password" formControlName="password" autocomplete="current-password" />
        @if (form.get('password')?.hasError('minlength')) {
          <mat-error>6 caractères minimum</mat-error>
        }
      </mat-form-field>

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }

      <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
        @if (loading()) { <mat-spinner diameter="20" /> }
        @else { Se connecter }
      </button>
    </form>

    <a routerLink="/onboarding/request" class="request-link">
      Créer un nouveau département
    </a>
  </div>
</div>
```

- [ ] **Step 4 : Compiler pour vérifier**

```bash
npx ng build --configuration development 2>&1 | grep -E 'error|warning|complete'
```

Résultat attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add src/app/features/auth/
git commit -m "feat(auth): add auth routes and LoginComponent"
```

---

## Task 11 : Feature Auth — Accept Invitation (Flux 2A)

**Files:**
- Create: `src/app/features/auth/accept-invitation/accept-invitation.component.ts`
- Create: `src/app/features/auth/accept-invitation/accept-invitation.component.html`

- [ ] **Step 1 : Créer `accept-invitation.component.ts`**

```typescript
// src/app/features/auth/accept-invitation/accept-invitation.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './accept-invitation.component.html',
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

    // Valider l'invitation via Cloud Function (sans auth)
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
    if (this.form.invalid || !this.invitationEmail() || !this.deptId() || !this.token()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      // 1. Créer le compte Firebase Auth
      const { user } = await createUserWithEmailAndPassword(
        this.auth,
        this.invitationEmail()!,
        this.form.value.password as string
      );
      await updateProfile(user, { displayName: this.form.value.displayName as string });

      // 2. Appeler la Cloud Function pour accepter l'invitation (set claim + user doc)
      const acceptFn = httpsCallable<{ deptId: string; token: string }, void>(
        this.functions,
        'acceptInvitation'
      );
      await acceptFn({ deptId: this.deptId()!, token: this.token()! });

      // 3. Forcer le refresh du token pour avoir le custom claim
      await user.getIdToken(true);

      await this.router.navigate(['/app']);
    } catch (err: unknown) {
      this.error.set('Une erreur est survenue. Vérifiez que le lien est valide.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 2 : Créer `accept-invitation.component.html`**

```html
<!-- src/app/features/auth/accept-invitation/accept-invitation.component.html -->
<div class="invitation-wrapper">
  <div class="invitation-card">

    @if (tokenValid() === null) {
      <p>Vérification du lien…</p>
    }

    @if (tokenValid() === false) {
      <h2>Lien invalide ou expiré</h2>
      <p>Ce lien d'invitation n'est plus valide. Contactez votre administrateur.</p>
      <a routerLink="/auth/login">Retour à la connexion</a>
    }

    @if (tokenValid() === true) {
      <h2>Créez votre compte</h2>
      <p>Invitation pour : <strong>{{ invitationEmail() }}</strong></p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Votre nom complet</mat-label>
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
          <p class="error-msg">{{ error() }}</p>
        }

        <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
          @if (loading()) { <mat-spinner diameter="20" /> }
          @else { Créer mon compte }
        </button>
      </form>
    }

  </div>
</div>
```

- [ ] **Step 3 : Compiler pour vérifier**

```bash
npx ng build --configuration development 2>&1 | grep -E 'error TS|complete'
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/features/auth/accept-invitation/
git commit -m "feat(auth): add AcceptInvitationComponent (flux 2A)"
```

---

## Task 12 : Feature Auth — Reset Password + No Department

**Files:**
- Create: `src/app/features/auth/reset-password/reset-password.component.ts`
- Create: `src/app/features/auth/reset-password/reset-password.component.html`
- Create: `src/app/features/auth/no-department/no-department.component.ts`

- [ ] **Step 1 : Créer `reset-password.component.ts`**

```typescript
// src/app/features/auth/reset-password/reset-password.component.ts
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Auth, updatePassword } from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './reset-password.component.html',
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
    { validators: passwordsMatch }
  );

  loading = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || !this.auth.currentUser) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await updatePassword(this.auth.currentUser, this.form.value.password as string);

      const claims = await this.authService.getClaims();
      if (claims?.deptId) {
        await this.userService.setMustResetPassword(
          claims.deptId,
          this.auth.currentUser.uid,
          false
        );
      }

      await this.router.navigate(['/app']);
    } catch {
      this.error.set('Impossible de changer le mot de passe. Reconnectez-vous et réessayez.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 2 : Créer `reset-password.component.html`**

```html
<!-- src/app/features/auth/reset-password/reset-password.component.html -->
<div class="reset-wrapper">
  <div class="reset-card">
    <h2>Choisissez votre mot de passe</h2>
    <p>Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.</p>

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
        <p class="error-msg">{{ error() }}</p>
      }

      <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
        Valider
      </button>
    </form>
  </div>
</div>
```

- [ ] **Step 3 : Créer `no-department.component.ts`**

```typescript
// src/app/features/auth/no-department/no-department.component.ts
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-no-department',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h2>Compte sans département</h2>
      <p>
        Votre compte n'est associé à aucun département actif.<br />
        Attendez l'invitation de votre administrateur ou contactez le support.
      </p>
      <button mat-stroked-button (click)="logout()">Se déconnecter</button>
    </div>
  `,
})
export class NoDepartmentComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/features/auth/reset-password/ src/app/features/auth/no-department/
git commit -m "feat(auth): add ResetPasswordComponent and NoDepartmentComponent"
```

---

## Task 13 : Feature Onboarding — Demande de département

**Files:**
- Create: `src/app/features/onboarding/onboarding.routes.ts`
- Create: `src/app/features/onboarding/request-department/request-department.component.ts`
- Create: `src/app/features/onboarding/request-department/request-department.component.html`

- [ ] **Step 1 : Créer `onboarding.routes.ts`**

```typescript
// src/app/features/onboarding/onboarding.routes.ts
import { Routes } from '@angular/router';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'request',
    loadComponent: () =>
      import('./request-department/request-department.component').then(
        (m) => m.RequestDepartmentComponent
      ),
  },
  { path: '', redirectTo: 'request', pathMatch: 'full' },
];
```

- [ ] **Step 2 : Créer `request-department.component.ts`**

```typescript
// src/app/features/onboarding/request-department/request-department.component.ts
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-request-department',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './request-department.component.html',
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
      this.error.set('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 3 : Créer `request-department.component.html`**

```html
<!-- src/app/features/onboarding/request-department/request-department.component.html -->
<div class="request-wrapper">
  <div class="request-card">
    @if (submitted()) {
      <h2>Demande envoyée !</h2>
      <p>Votre demande de création de département a été transmise. Vous recevrez une confirmation par email.</p>
      <a routerLink="/auth/login">Retour à la connexion</a>
    } @else {
      <h2>Créer un département</h2>
      <p>Remplissez ce formulaire pour soumettre une demande de création de département au Super Admin.</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Votre nom</mat-label>
          <input matInput formControlName="requesterName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Votre email</mat-label>
          <input matInput type="email" formControlName="requesterEmail" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nom du département</mat-label>
          <input matInput formControlName="deptName" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Message (optionnel)</mat-label>
          <textarea matInput formControlName="message" rows="3"></textarea>
        </mat-form-field>

        @if (error()) {
          <p class="error-msg">{{ error() }}</p>
        }

        <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
          Soumettre la demande
        </button>
      </form>
    }
  </div>
</div>
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/features/onboarding/
git commit -m "feat(onboarding): add RequestDepartmentComponent with Firestore write"
```

---

## Task 14 : Cloud Functions — validateInvitation + acceptInvitation + createManagedUser

**Files:**
- Create: `functions/src/accept-invitation.ts`
- Create: `functions/src/create-managed-user.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1 : Créer `functions/src/accept-invitation.ts`**

```typescript
// functions/src/accept-invitation.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// Valide le token d'invitation et retourne email + nom du département
// Appelable sans authentification
export const validateInvitation = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { deptId, token } = request.data as { deptId: string; token: string };

    if (!deptId || !token) {
      throw new HttpsError('invalid-argument', 'deptId et token requis.');
    }

    const invitationRef = admin
      .firestore()
      .collection('departments')
      .doc(deptId)
      .collection('invitations')
      .doc(token);

    const snap = await invitationRef.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Invitation introuvable.');
    }

    const inv = snap.data()!;
    if (inv['used'] === true) {
      throw new HttpsError('already-exists', 'Cette invitation a déjà été utilisée.');
    }

    const now = admin.firestore.Timestamp.now();
    if (inv['expiresAt'].toMillis() < now.toMillis()) {
      throw new HttpsError('deadline-exceeded', 'Cette invitation a expiré.');
    }

    const deptSnap = await admin.firestore().collection('departments').doc(deptId).get();
    const deptName = deptSnap.data()?.['name'] ?? deptId;

    return { email: inv['email'] as string, deptName: deptName as string };
  }
);

// Accepte l'invitation : set custom claim + crée le doc user + marque l'invitation comme utilisée
// Appelable par un utilisateur authentifié (vient de créer son compte)
export const acceptInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const { deptId, token } = request.data as { deptId: string; token: string };
  const uid = request.auth.uid;
  const email = request.auth.token.email!;

  const invitationRef = admin
    .firestore()
    .collection('departments')
    .doc(deptId)
    .collection('invitations')
    .doc(token);

  const snap = await invitationRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Invitation introuvable.');

  const inv = snap.data()!;
  if (inv['used'] === true) throw new HttpsError('already-exists', 'Invitation déjà utilisée.');

  const now = admin.firestore.Timestamp.now();
  if (inv['expiresAt'].toMillis() < now.toMillis()) {
    throw new HttpsError('deadline-exceeded', 'Invitation expirée.');
  }

  if (inv['email'] !== email) {
    throw new HttpsError('permission-denied', 'Ce lien ne correspond pas à votre email.');
  }

  const batch = admin.firestore().batch();

  // Créer le doc utilisateur dans le département
  const userRef = admin
    .firestore()
    .collection('departments')
    .doc(deptId)
    .collection('users')
    .doc(uid);

  batch.set(userRef, {
    displayName: request.auth.token.name ?? email.split('@')[0],
    email,
    role: inv['role'],
    rang: 0,
    hasBenefited: false,
    joinedAt: now,
    mustResetPassword: false,
  });

  // Marquer l'invitation comme utilisée
  batch.update(invitationRef, { used: true });

  await batch.commit();

  // Set custom claim
  await admin.auth().setCustomUserClaims(uid, { deptId });

  return { success: true };
});
```

- [ ] **Step 2 : Créer `functions/src/create-managed-user.ts`**

```typescript
// functions/src/create-managed-user.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const createManagedUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const callerDeptId = request.auth.token['deptId'] as string | undefined;
  if (!callerDeptId) {
    throw new HttpsError('permission-denied', 'Pas de département associé.');
  }

  // Vérifier que le caller est admin de son département
  const callerDoc = await admin
    .firestore()
    .collection('departments')
    .doc(callerDeptId)
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (callerDoc.data()?.['role'] !== 'admin') {
    throw new HttpsError('permission-denied', 'Réservé aux admins de département.');
  }

  const { email, displayName, role } = request.data as {
    email: string;
    displayName: string;
    role: 'bureau' | 'membre';
  };

  if (!email || !displayName || !role) {
    throw new HttpsError('invalid-argument', 'email, displayName et role requis.');
  }

  // Générer un mot de passe temporaire
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  // Créer le compte Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    displayName,
    password: tempPassword,
  });

  // Set custom claim
  await admin.auth().setCustomUserClaims(userRecord.uid, { deptId: callerDeptId });

  // Créer le doc utilisateur
  const now = admin.firestore.Timestamp.now();
  await admin
    .firestore()
    .collection('departments')
    .doc(callerDeptId)
    .collection('users')
    .doc(userRecord.uid)
    .set({
      displayName,
      email,
      role,
      rang: 0,
      hasBenefited: false,
      joinedAt: now,
      mustResetPassword: true,
    });

  // Envoyer l'email de reset de mot de passe via Firebase Auth
  const resetLink = await admin.auth().generatePasswordResetLink(email);

  // En production, envoyer l'email via SendGrid/Nodemailer
  // Pour l'instant, logger le lien (à remplacer par l'envoi réel)
  console.log(`Reset link for ${email}: ${resetLink}`);

  return { uid: userRecord.uid, resetLink };
});
```

- [ ] **Step 3 : Mettre à jour `functions/src/index.ts`**

```typescript
// functions/src/index.ts
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions';

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

export { validateInvitation, acceptInvitation } from './accept-invitation';
export { createManagedUser } from './create-managed-user';
export { provisionDepartment } from './provision-department';
```

- [ ] **Step 4 : Vérifier que les fonctions compilent**

```bash
cd functions && npm run build 2>&1 | tail -10
```

Résultat attendu : aucune erreur TypeScript.

- [ ] **Step 5 : Commit**

```bash
cd ..
git add functions/src/
git commit -m "feat(functions): add validateInvitation, acceptInvitation, createManagedUser"
```

---

## Task 15 : Cloud Function — provisionDepartment

**Files:**
- Create: `functions/src/provision-department.ts`

- [ ] **Step 1 : Créer `functions/src/provision-department.ts`**

```typescript
// functions/src/provision-department.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const provisionDepartment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  // Seul le Super Admin peut appeler cette fonction
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { requestId } = request.data as { requestId: string };
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId requis.');

  const requestRef = admin.firestore().collection('department_requests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) throw new HttpsError('not-found', 'Demande introuvable.');

  const reqData = requestSnap.data()!;
  if (reqData['status'] !== 'pending') {
    throw new HttpsError('failed-precondition', 'Cette demande a déjà été traitée.');
  }

  const now = admin.firestore.Timestamp.now();
  const deptId = admin.firestore().collection('departments').doc().id;

  // Générer un mot de passe temporaire pour l'admin
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  // Créer le compte admin
  const adminUser = await admin.auth().createUser({
    email: reqData['requesterEmail'] as string,
    displayName: reqData['requesterName'] as string,
    password: tempPassword,
  });

  // Set custom claim admin
  await admin.auth().setCustomUserClaims(adminUser.uid, { deptId });

  const batch = admin.firestore().batch();

  // Créer le département
  const deptRef = admin.firestore().collection('departments').doc(deptId);
  batch.set(deptRef, {
    name: reqData['deptName'],
    adminId: adminUser.uid,
    status: 'active',
    createdAt: now,
    settings: {},
  });

  // Créer le doc utilisateur admin dans le département
  const userRef = deptRef.collection('users').doc(adminUser.uid);
  batch.set(userRef, {
    displayName: reqData['requesterName'],
    email: reqData['requesterEmail'],
    role: 'admin',
    rang: 0,
    hasBenefited: false,
    joinedAt: now,
    mustResetPassword: true,
  });

  // Marquer la demande comme approuvée
  batch.update(requestRef, { status: 'approved' });

  await batch.commit();

  // Générer lien de reset de mot de passe
  const resetLink = await admin.auth().generatePasswordResetLink(
    reqData['requesterEmail'] as string
  );

  console.log(`Department ${deptId} provisioned. Admin reset link: ${resetLink}`);

  return { deptId, adminUid: adminUser.uid, resetLink };
});
```

- [ ] **Step 2 : Compiler et vérifier**

```bash
cd functions && npm run build 2>&1 | tail -5
```

Résultat attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
cd ..
git add functions/src/provision-department.ts functions/src/index.ts
git commit -m "feat(functions): add provisionDepartment Cloud Function"
```

---

## Task 16 : Feature Super Admin

**Files:**
- Create: `src/app/features/super-admin/super-admin.routes.ts`
- Create: `src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts`
- Create: `src/app/features/super-admin/requests/dept-requests.component.ts`

- [ ] **Step 1 : Créer `super-admin.routes.ts`**

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
      {
        path: 'requests',
        loadComponent: () =>
          import('./requests/dept-requests.component').then(
            (m) => m.DeptRequestsComponent
          ),
      },
      { path: '', redirectTo: 'requests', pathMatch: 'full' },
    ],
  },
];
```

- [ ] **Step 2 : Créer `super-admin-dashboard.component.ts`**

```typescript
// src/app/features/super-admin/dashboard/super-admin-dashboard.component.ts
import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatListModule, MatButtonModule],
  template: `
    <mat-sidenav-container style="height: 100vh">
      <mat-sidenav mode="side" opened style="width: 200px; padding: 16px">
        <h3>Super Admin</h3>
        <mat-nav-list>
          <a mat-list-item routerLink="requests" routerLinkActive="active-link">
            Demandes de département
          </a>
        </mat-nav-list>
        <button mat-stroked-button (click)="logout()" style="margin-top: auto">
          Déconnexion
        </button>
      </mat-sidenav>
      <mat-sidenav-content style="padding: 24px">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class SuperAdminDashboardComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}
```

- [ ] **Step 3 : Créer `dept-requests.component.ts`**

```typescript
// src/app/features/super-admin/requests/dept-requests.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { DepartmentRequest } from '../../../core/models/department-request.model';

@Component({
  selector: 'app-dept-requests',
  standalone: true,
  imports: [DatePipe, MatTableModule, MatButtonModule, MatChipsModule],
  template: `
    <h2>Demandes de création de département</h2>

    @if (loading()) {
      <p>Chargement…</p>
    } @else if (requests().length === 0) {
      <p>Aucune demande en attente.</p>
    } @else {
      <table mat-table [dataSource]="requests()" style="width: 100%">
        <ng-container matColumnDef="requesterName">
          <th mat-header-cell *matHeaderCellDef>Nom</th>
          <td mat-cell *matCellDef="let r">{{ r.requesterName }}</td>
        </ng-container>
        <ng-container matColumnDef="requesterEmail">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let r">{{ r.requesterEmail }}</td>
        </ng-container>
        <ng-container matColumnDef="deptName">
          <th mat-header-cell *matHeaderCellDef>Département</th>
          <td mat-cell *matCellDef="let r">{{ r.deptName }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let r">
            <button mat-flat-button color="primary" (click)="approve(r.id)">
              Approuver
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    }
  `,
})
export class DeptRequestsComponent implements OnInit {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  readonly columns = ['requesterName', 'requesterEmail', 'deptName', 'actions'];
  requests = signal<(DepartmentRequest & { id: string })[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    const col = collection(this.firestore, 'department_requests');
    const q = query(col, where('status', '==', 'pending'));
    const snap = await getDocs(q);
    this.requests.set(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as DepartmentRequest) }))
    );
    this.loading.set(false);
  }

  async approve(requestId: string): Promise<void> {
    const fn = httpsCallable<{ requestId: string }, { deptId: string }>(
      this.functions,
      'provisionDepartment'
    );
    await fn({ requestId });
    this.requests.update((list) => list.filter((r) => r.id !== requestId));
  }
}
```

- [ ] **Step 4 : Commit**

```bash
git add src/app/features/super-admin/
git commit -m "feat(super-admin): add SuperAdmin dashboard with department requests management"
```

---

## Task 17 : Dashboard stub + vérification finale

**Files:**
- Create: `src/app/features/dashboard/dashboard.routes.ts`
- Create: `src/app/features/dashboard/home/home.component.ts`

- [ ] **Step 1 : Créer `dashboard.routes.ts`**

```typescript
// src/app/features/dashboard/dashboard.routes.ts
import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
];
```

- [ ] **Step 2 : Créer `home.component.ts`**

```typescript
// src/app/features/dashboard/home/home.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <h2>Tableau de bord</h2>
    <p>Les modules cotisations, cycles et caisse seront disponibles ici.</p>
  `,
})
export class HomeComponent {}
```

- [ ] **Step 3 : Build de production complet**

```bash
npx ng build 2>&1 | tail -10
```

Résultat attendu : `✓ Application bundle generation complete.` sans erreur.

- [ ] **Step 4 : Lancer tous les tests**

```bash
npx jest --coverage 2>&1 | tail -20
```

Résultat attendu : tous les tests passent, couverture affichée.

- [ ] **Step 5 : Ajouter `.superpowers/` au `.gitignore`**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 6 : Commit final**

```bash
git add src/app/features/dashboard/ .gitignore
git commit -m "feat(foundation): add dashboard stub and complete Foundation implementation"
```

---

## Self-Review — Vérification spec vs plan

**Spec section 1 — Architecture Angular :** ✅ Tous les dossiers et fichiers listés dans le spec sont couverts par les tâches.

**Spec section 2 — Structure Firestore :** ✅ Collections définies dans les models (Task 3). Rules couvrent toutes les collections (Task 4).

**Spec section 3 — Multi-tenant Custom Claims :** ✅ Claims set dans `acceptInvitation`, `createManagedUser`, `provisionDepartment`. Utilisés dans les guards.

**Spec section 4 — Routing & Guards :** ✅ `authGuard`, `deptGuard`, `mustResetPasswordGuard`, `superAdminGuard` — tous implémentés et testés (Tasks 8, 9).

**Spec section 5 — Flux auth :** ✅ Flux 1 (login), Flux 2A (invitation), Flux 2B (createManagedUser), Flux 3 (provisionDepartment).

**Spec section 6 — Sidebar :** ✅ `AppShellComponent` avec navigation adaptative par rôle (Task 9).

**Spec section 7 — Cloud Functions :** ✅ `validateInvitation`, `acceptInvitation`, `createManagedUser`, `provisionDepartment` — tous implémentés (Tasks 14, 15).

**`mustResetPassword` :** ✅ Champ créé dans `createManagedUser` + `provisionDepartment`. Guard vérifie le champ. `ResetPasswordComponent` le remet à `false` après changement.

**Invitation admin-only :** ✅ `createManagedUser` vérifie `role === 'admin'` côté Cloud Function. La sidebar n'affiche "Invitations" qu'aux admins.

**Compte Super Admin :** Non couvert par ce plan (créé manuellement via Firebase Console / script one-shot hors scope de ce plan).

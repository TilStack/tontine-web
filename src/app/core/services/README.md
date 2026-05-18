# core/services/

Les **services Angular** sont des classes partagées entre tous les composants de l'application. Ils centralisent la logique de communication avec Firebase et l'API.

> **Principe :** Les composants affichent des données, les services les récupèrent. Un composant ne devrait jamais appeler Firebase ou l'API directement.

---

## api.service.ts — Le client HTTP partagé

C'est le **point d'entrée unique** pour tous les appels vers `tontine-api`.

```typescript
post<T = void>(endpoint: string, body: unknown): Observable<T>
```

**Ce qu'il fait automatiquement à chaque appel :**
1. Récupère le token Firebase de l'utilisateur connecté
2. L'attache dans l'en-tête `Authorization: Bearer <token>`
3. Fait le POST vers `environment.apiUrl + endpoint`
4. Retourne un `Observable<T>` (flux de données réactif)

**Pourquoi une classe dédiée plutôt qu'appeler `HttpClient` directement ?**
Sans `ApiService`, chaque service devrait répéter la logique de récupération du token. Avec `ApiService`, le token est géré en un seul endroit.

```typescript
// Dans un service métier (ex: SaisonService)
createSaison(payload): Promise<...> {
  return firstValueFrom(this.api.post('/saison/create', payload));
  // Pas besoin de penser au token — ApiService s'en charge
}
```

---

## auth.service.ts — Authentification

Encapsule Firebase Auth pour la connexion/déconnexion.

| Méthode | Description |
|---|---|
| `user$` | Observable : émet l'utilisateur connecté (ou `null` si déconnecté) |
| `login(email, password)` | Connexion par email/mot de passe |
| `logout()` | Déconnexion |
| `sendPasswordReset(email)` | Envoie un email de réinitialisation |
| `getClaims()` | Lit les custom claims du token (`deptId`, `role`) |
| `forceTokenRefresh()` | Force le renouvellement du token (ex: après acceptation d'invitation) |

---

## saison.service.ts — Saisons

| Méthode | Type | Description |
|---|---|---|
| `watchActiveSaison(deptId)` | Observable | Écoute la saison active en temps réel |
| `createSaison(payload)` | Promise | Crée une saison via l'API |

`watchActiveSaison` utilise une **requête Firestore en temps réel** (via `collectionData`). L'interface se met à jour automatiquement si la saison change dans Firestore, sans recharger la page.

---

## cycle.service.ts — Cycles

| Méthode | Type | Description |
|---|---|---|
| `watchCurrentCycle(deptId, saisonId, index)` | Observable | Écoute le cycle actif + ses cotisations |
| `watchClosedCycles(deptId, saisonId)` | Observable | Écoute l'historique des cycles fermés |
| `markCotisationPaid(payload)` | Promise | Marque une cotisation payée |
| `forceCloseCycle(payload)` | Promise | Ferme un cycle manuellement |
| `openNextCycle(payload)` | Promise | Ouvre le cycle suivant |
| `confirmReception(payload)` | Promise | Bénéficiaire confirme la réception |

`watchCurrentCycle` est une **requête imbriquée** : elle observe d'abord le cycle, puis pour ce cycle, observe les cotisations de tous les membres. Si un membre paie, la liste se met à jour en temps réel.

---

## user.service.ts — Utilisateurs/Membres

| Méthode | Type | Description |
|---|---|---|
| `watchProfile(deptId, uid)` | Observable | Profil en temps réel |
| `watchAllMembers(deptId)` | Observable | Liste de tous les membres |
| `createProfile(...)` | Promise | Crée un profil Firestore directement |
| `setMustResetPassword(...)` | Promise | Met à jour le flag de reset |
| `sendInvitation(payload)` | Promise | Crée une invitation via l'API |
| `updateUserRole(payload)` | Promise | Change le rôle d'un membre via l'API |

---

## caisse.service.ts — Caisse

| Méthode | Type | Description |
|---|---|---|
| `watchCaisse(deptId)` | Observable | Solde de la caisse en temps réel |
| `watchTransactions(deptId)` | Observable | 100 dernières transactions (ordre chronologique inversé) |
| `addTransaction(payload)` | Promise | Enregistre une dépense via l'API |

---

## notification.service.ts — Notifications in-app

Écoute la collection `users/{uid}/notifications/` en temps réel et expose les notifications non lues. Les composants s'abonnent pour afficher les badges et les messages.

---

## Pattern commun : Observable vs Promise

- **`Observable`** (méthodes `watch*`) → données en temps réel, la vue se met à jour automatiquement
- **`Promise`** (méthodes `create*`, `mark*`, etc.) → action ponctuelle, on attend la confirmation

```typescript
// Dans un composant
ngOnInit() {
  // Observable : souscription continue
  this.cycleService.watchCurrentCycle(deptId, saisonId, index)
    .subscribe(data => this.cycleData = data);

  // Promise : action unique
  await this.cycleService.markCotisationPaid({ saisonId, cycleId, userId });
}
```

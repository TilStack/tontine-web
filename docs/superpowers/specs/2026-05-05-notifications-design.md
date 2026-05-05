# Notifications Module Design

> **For agentic workers:** This spec is implemented via `docs/superpowers/plans/2026-05-05-notifications.md`.

**Goal:** Add a dual-channel notification system (in-app Firestore + email via Firebase Trigger Email extension) covering 5 lifecycle events in the tontine cycle.

**Architecture:** A shared `_notify.ts` helper module (Cloud Functions side, not deployed) writes atomically to per-user Firestore notification documents and to a root `/mail` collection. Angular `NotificationService` + `NotificationBellComponent` surface unread notifications in the app shell header.

**Tech Stack:** Angular 20, AngularFire v20, Firebase Cloud Functions v2 (Admin SDK), Firebase Extension "Trigger Email from Firestore" (SendGrid), Angular Material, RxJS, `toSignal`.

---

## 1. Notification Types

TypeScript union — defined in both `functions/src/_notify.ts` and `src/app/core/models/notification.model.ts`:

```typescript
type NotificationType =
  | 'rappel_j5'
  | 'paiement_enregistre'
  | 'cagnotte_complete'
  | 'penalite_appliquee'
  | 'beneficiaire_confirme'
  | 'cycle_ouvert'     // reserved — not triggered in this module
  | 'cycle_cloture';   // reserved — not triggered in this module
```

---

## 2. Notification Event Matrix

| Type | Trigger function | In-app recipients | Email recipients |
|------|-----------------|-------------------|-----------------|
| `rappel_j5` | `j5-reminder-cron` (daily 08:00 Africa/Douala) | Unpaid members (personal message) + Admin & Bureau (summary with pending list) | Idem |
| `paiement_enregistre` | `mark-cotisation-paid` | Paying member only | Idem |
| `cagnotte_complete` | `_close-cycle` when `closedBy === 'auto'` | Beneficiary (personal) + Admin & Bureau (summary) | Idem |
| `penalite_appliquee` | `_close-cycle` when `penalized.length > 0` (any `closedBy`) | Penalized members (personal) + Admin & Bureau (summary with ranks) | Idem |
| `beneficiaire_confirme` | `confirm-reception` | Beneficiary (self-confirmation) + Admin & Bureau | Admin & Bureau only (no email to beneficiary) |

**Rule for `penalite_appliquee`:** fired only when `penalized.length > 0`. If `closedBy === 'auto'` (everyone paid), `penalized.length === 0` — only `cagnotte_complete` fires, never `penalite_appliquee`.

---

## 3. Backend — `_notify.ts` Shared Helper

### 3.1 Contract

- **File:** `functions/src/_notify.ts`
- **Not a deployed Cloud Function** — imported directly by other functions.
- Each helper writes atomically via `db.batch()`:
  1. One or more documents to `/departments/{deptId}/users/{uid}/notifications/{notifId}` (in-app)
  2. One or more documents to `/mail/{docId}` (email, consumed by Trigger Email extension)
- **Never throws.** All errors are caught and logged via `console.error()` so that a notification failure never aborts the caller's business logic.
- Every in-app notification document sets `expiresAt = createdAt + 30 days` for Firestore TTL auto-deletion.

### 3.2 Firestore In-App Document Schema

Path: `/departments/{deptId}/users/{uid}/notifications/{notifId}`

```typescript
interface NotificationDoc {
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;        // always false at creation
  createdAt: Timestamp;
  expiresAt: Timestamp; // createdAt + 30 days — Firestore TTL field
}
```

### 3.3 Helper Signatures

```typescript
export async function notifyPaymentRecorded(params: {
  db: Firestore;
  deptId: string;
  userId: string;
  userEmail: string;
  cycleIndex: number;
  montant: number;
}): Promise<void>

export async function notifyJ5(params: {
  db: Firestore;
  deptId: string;
  unpaidUids: string[];
  deadline: Timestamp;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  memberEmails: Record<string, string>;  // uid → email
  adminEmails: string[];
}): Promise<void>

export async function notifyKittyComplete(params: {
  db: Firestore;
  deptId: string;
  beneficiaryUid: string;
  beneficiaryEmail: string;
  montantVerse: number;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  adminEmails: string[];
}): Promise<void>

export async function notifyLatePayment(params: {
  db: Firestore;
  deptId: string;
  penalizedUids: string[];
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  penalizedEmails: Record<string, string>;  // uid → email
  adminEmails: string[];
  newRanks: Record<string, number>;          // uid → new 1-based rank in updated memberOrder
}): Promise<void>

export async function notifyConfirmation(params: {
  db: Firestore;
  deptId: string;
  beneficiaryUid: string;
  beneficiaryName: string;
  montantVerse: number;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  adminEmails: string[];
}): Promise<void>
```

### 3.4 `/mail` Document Schema

Root-level collection consumed by the Trigger Email extension:

```typescript
interface MailDoc {
  to: string[];
  message: {
    subject: string;
    html: string;
    text: string;
  };
  createdAt: Timestamp;
  deptId: string;  // for auditability
}
```

---

## 4. Backend — New Scheduled Function: `j5-reminder-cron.ts`

- **Schedule:** `'0 7 * * *'` UTC = 08:00 Africa/Douala (UTC+1, no DST).
- **Query:** `collectionGroup('cycles')` where `status === 'open'` and `deadline` falls on the calendar day `today + 5` in Africa/Douala timezone. Concretely: compute `targetDate` = midnight Africa/Douala on day D+5; query `deadline >= targetDate` and `deadline < targetDate + 24h` (both converted to UTC for Firestore). Since Africa/Douala = UTC+1, midnight Africa/Douala = 23:00 UTC the previous calendar day in UTC — the implementation plan provides the exact UTC arithmetic.
- **Per matched cycle:**
  1. Read `cotisations` subcollection — collect UIDs where `paid === false`.
  2. Read `departments/{deptId}/users` — collect UIDs/emails for admin and bureau roles.
  3. If `unpaidUids.length > 0`: call `await notifyJ5(...)`.
  4. If `unpaidUids.length === 0`: skip (everyone already paid, no reminder needed).

---

## 5. Backend — Modified Functions

### `mark-cotisation-paid.ts`

After the existing transaction resolves (whether or not it triggers auto-close):

```typescript
await notifyPaymentRecorded({
  db, deptId, userId, userEmail, cycleIndex, montant
});
```

The email is fetched from the user's profile document before calling the helper.

### `_close-cycle.ts`

After the transaction commits, read all department users to collect emails and roles, then:

- If `closedBy === 'auto'`:
  ```typescript
  await notifyKittyComplete({ db, deptId, beneficiaryUid, beneficiaryEmail,
    montantVerse, cycleIndex, adminUids, bureauUids, adminEmails });
  ```

- If `penalizedUids.length > 0` (any `closedBy`):
  ```typescript
  await notifyLatePayment({ db, deptId, penalizedUids, cycleIndex,
    adminUids, bureauUids, penalizedEmails, adminEmails, newRanks });
  ```

Both conditions can be true simultaneously only if `closedBy === 'auto'` and someone was penalized — which cannot happen (`auto` means all paid = no penalties). So the two notifications are mutually exclusive in practice.

### `confirm-reception.ts`

After the existing confirmation write:

```typescript
await notifyConfirmation({ db, deptId, beneficiaryUid, beneficiaryName,
  montantVerse, cycleIndex, adminUids, bureauUids, adminEmails });
```

`notifyConfirmation` in `_notify.ts` must carry a comment documenting the deliberate asymmetry:
- Beneficiary → **in-app only** (no email): they just performed the action themselves, an email is redundant.
- Admin & Bureau → **in-app + email**: they need an async paper trail since they may not be in the app at that moment.

### `index.ts`

Export the new scheduled function:
```typescript
export { j5RemindCron } from './j5-reminder-cron.js';
```

---

## 6. Frontend — `NotificationService`

File: `src/app/core/services/notification.service.ts`

```typescript
watchNotifications(deptId: string, uid: string): Observable<NotificationDoc[]>
// Query: collection /departments/{deptId}/users/{uid}/notifications
// orderBy('createdAt', 'desc'), limit(50)
// Returns all docs (read + unread); component filters for badge count

markAsRead(deptId: string, uid: string, notifId: string): Promise<void>
// Single updateDoc with { read: true }
// Firestore rule restricts update to the 'read' field only

markAllAsRead(deptId: string, uid: string, notifIds: string[]): Promise<void>
// Single db.batch() with one updateDoc({ read: true }) per notifId
// Avoids N separate round-trips when marking all unread notifications as read
```

---

## 7. Frontend — Angular Components

### `NotificationBellComponent`

Location: `src/app/shared/components/notification-bell/`

- Injected into `AppShellComponent` header.
- Uses `toSignal(notificationService.watchNotifications(deptId, uid))`.
- `unreadCount = computed(() => notifications().filter(n => !n.read).length)`.
- Renders a `mat-icon-button` with a `matBadge` (hidden when `unreadCount() === 0`).
- Opens `NotificationPanelComponent` as a `mat-menu` on click.

### `NotificationPanelComponent`

Location: `src/app/shared/components/notification-panel/`

- Rendered as `mat-menu` content anchored to the bell button.
- Lists notifications: unread first (bold), then read.
- Click on a notification:
  1. Calls `markAsRead(...)`.
  2. Navigates via Angular `Router`:
     - `rappel_j5` → `/app/cycles`
     - `paiement_enregistre` → `/app/cycles`
     - `cagnotte_complete` → `/app/cycles`
     - `penalite_appliquee` → `/app/cycles/history`
     - `beneficiaire_confirme` → `/app/cycles`
- "Tout marquer comme lu" button — calls `markAsRead` for all unread notifications.
- Empty state: "Aucune notification."

---

## 8. Firestore Security Rules

Added to `firestore.rules`:

```
match /departments/{deptId}/users/{userId}/notifications/{notifId} {
  allow read: if request.auth.uid == userId && inDept(deptId);
  allow update: if request.auth.uid == userId
                && inDept(deptId)
                && request.resource.data.diff(resource.data)
                   .affectedKeys().hasOnly(['read']);
  // create and delete: Admin SDK only (no client rule)
}

match /mail/{docId} {
  allow read, write: if false;  // Admin SDK only
}
```

---

## 9. Pre-Deployment Configuration

These steps must be completed manually in Firebase Console **before deploying** the Notifications module:

1. **Firebase Extension — Trigger Email from Firestore**
   - Install from Firebase Console → Extensions → "Trigger Email from Firestore"
   - Configure: SendGrid API key, collection path `/mail`, default FROM address (e.g., `noreply@tontine-dept.app`)

2. **Firestore TTL Policy**
   - Firebase Console → Firestore → TTL policies
   - Collection group: `notifications`
   - TTL field: `expiresAt`
   - Enables automatic deletion of notification documents 30 days after creation — no cron needed.

---

## 10. Testing Strategy

### Cloud Functions

- `_notify.ts`: unit tests mock `db.batch()` — verify correct document paths, field values, and `expiresAt` computation for each helper. Verify that a thrown error inside the batch is caught and logged, not re-thrown.
- `j5-reminder-cron.ts`: mock Firestore `collectionGroup` query — verify `notifyJ5` is called with correct `unpaidUids`, skipped when `unpaidUids.length === 0`.
- Modified functions (`mark-cotisation-paid`, `_close-cycle`, `confirm-reception`): verify the relevant `notify*` helper is called after the transaction with correct params.

### Angular

- `NotificationService` spec: mock AngularFire `collectionData`, verify `watchNotifications` returns correct Observable; mock `updateDoc`, verify `markAsRead` writes only `{ read: true }`.
- `NotificationBellComponent` spec: verify `matBadge` hidden at `unreadCount === 0`, shows correct count otherwise.
- `NotificationPanelComponent` spec: verify router navigation mapping for each `NotificationType`; verify "Tout marquer comme lu" calls `markAsRead` for all unread docs.

---

## 11. File Summary

**New files:**
- `functions/src/_notify.ts`
- `functions/src/j5-reminder-cron.ts`
- `src/app/core/models/notification.model.ts`
- `src/app/core/services/notification.service.ts`
- `src/app/core/services/notification.service.spec.ts`
- `src/app/shared/components/notification-bell/notification-bell.component.ts`
- `src/app/shared/components/notification-bell/notification-bell.component.html`
- `src/app/shared/components/notification-bell/notification-bell.component.spec.ts`
- `src/app/shared/components/notification-panel/notification-panel.component.ts`
- `src/app/shared/components/notification-panel/notification-panel.component.html`
- `src/app/shared/components/notification-panel/notification-panel.component.spec.ts`

**Modified files:**
- `functions/src/mark-cotisation-paid.ts`
- `functions/src/_close-cycle.ts`
- `functions/src/confirm-reception.ts`
- `functions/src/index.ts`
- `src/app/shared/components/app-shell/app-shell.component.ts`
- `src/app/shared/components/app-shell/app-shell.component.html`
- `firestore.rules`

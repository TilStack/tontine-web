# Notifications Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app notifications (Firestore, TTL 30 days) for 5 tontine lifecycle events. Email logic is present in `_notify.ts` but commented out pending Blaze plan activation.

**Architecture:** A shared `_notify.ts` helper module (not deployed, imported by Cloud Functions) writes to `/departments/{deptId}/users/{uid}/notifications` (in-app only — Solution C). Email sections are marked `// TODO: activer emails quand plan Blaze disponible`. `NotificationService` + `NotificationBellComponent` surface unread notifications in the `AppShellComponent` header.

**Tech Stack:** Angular 20, AngularFire v20, Firebase Cloud Functions v2 (Admin SDK), Angular Material (badge, menu, list, icon), RxJS, `toSignal`.

---

## Pre-requisites (manual — before any task)

1. **Create the worktree** (branch from `feature/cycles`, NOT master):
   ```bash
   cd /home/tilstack/Bureau/tontine-web
   git worktree add .worktrees/feature-notifications -b feature/notifications feature/cycles
   cd .worktrees/feature-notifications
   npm install --legacy-peer-deps
   cd functions && npm install && cd ..
   ```
   All tasks below run from `.worktrees/feature-notifications/`.

2. **Firebase pre-deployment config** (do before deploying):
   - Set Firestore TTL policy on `notifications` collection group, field `expiresAt` (Firebase Console → Firestore → TTL)
   - *(Email extension — not needed for Solution C. Activate later when Blaze plan is available.)*

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `functions/src/_notify.ts` | Create | 5 notify helpers + private utilities — not deployed |
| `functions/src/j5-reminder-cron.ts` | Create | Daily 08:00 Africa/Douala cron — sends J-5 reminders |
| `functions/src/mark-cotisation-paid.ts` | Modify | Add `notifyPaymentRecorded` call after transaction |
| `functions/src/_close-cycle.ts` | Modify | Return txResult from transaction, add `notifyKittyComplete` / `notifyLatePayment` |
| `functions/src/confirm-reception.ts` | Modify | Add `notifyConfirmation` call after confirmation write |
| `functions/src/index.ts` | Modify | Export `j5RemindCron` |
| `firestore.rules` | Modify | Add notifications subcollection rules + `/mail` block rule |
| `src/app/core/models/notification.model.ts` | Create | `NotificationDoc` interface + `NotificationType` union |
| `src/app/core/services/notification.service.ts` | Create | `watchNotifications`, `markAsRead`, `markAllAsRead` |
| `src/app/core/services/notification.service.spec.ts` | Create | Jest tests (4 tests) |
| `src/app/shared/components/notification-bell/notification-bell.component.ts` | Create | Bell icon with unread badge, opens panel |
| `src/app/shared/components/notification-bell/notification-bell.component.html` | Create | mat-icon-button + matBadge + mat-menu trigger |
| `src/app/shared/components/notification-bell/notification-bell.component.spec.ts` | Create | Jest tests (3 tests) |
| `src/app/shared/components/notification-panel/notification-panel.component.ts` | Create | Notification list, click → markAsRead + navigate |
| `src/app/shared/components/notification-panel/notification-panel.component.html` | Create | mat-list, empty state, "Tout marquer comme lu" button |
| `src/app/shared/components/notification-panel/notification-panel.component.spec.ts` | Create | Jest tests (4 tests) |
| `src/app/shared/components/app-shell/app-shell.component.ts` | Modify | Add `uid` signal, import `NotificationBellComponent` |
| `src/app/shared/components/app-shell/app-shell.component.html` | Modify | Add `<app-notification-bell>` in user-footer |

---

## Task 1: Angular notification model

**Files:**
- Create: `src/app/core/models/notification.model.ts`

> No Jest test needed — pure TypeScript type declarations. Verified by `tsc --noEmit`.

- [ ] **Step 1: Create the model file**

```typescript
// src/app/core/models/notification.model.ts
import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'rappel_j5'
  | 'paiement_enregistre'
  | 'cagnotte_complete'
  | 'penalite_appliquee'
  | 'beneficiaire_confirme'
  | 'cycle_ouvert'    // reserved — not triggered in this module
  | 'cycle_cloture';  // reserved — not triggered in this module

export interface NotificationDoc {
  id: string;  // added via collectionData idField
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from `.worktrees/feature-notifications/`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/core/models/notification.model.ts
git commit -m "feat(notifications): add NotificationDoc model and NotificationType"
```

---

## Task 2: `_notify.ts` — Cloud Function shared helper

**Files:**
- Create: `functions/src/_notify.ts`

> Verified by `npm run build` in `functions/`. No Jest test (no existing function test setup — follows project convention).

- [ ] **Step 1: Create `_notify.ts`**

```typescript
// functions/src/_notify.ts
import * as admin from 'firebase-admin';

export type NotificationType =
  | 'rappel_j5'
  | 'paiement_enregistre'
  | 'cagnotte_complete'
  | 'penalite_appliquee'
  | 'beneficiaire_confirme'
  | 'cycle_ouvert'
  | 'cycle_cloture';

type DB = admin.firestore.Firestore;
type Timestamp = admin.firestore.Timestamp;

// Returns a Firestore-ready in-app notification document.
// expiresAt is 30 days from now — used by Firestore TTL to auto-delete.
function notifData(
  type: NotificationType,
  title: string,
  body: string
): Record<string, unknown> {
  const now = admin.firestore.Timestamp.now();
  return {
    type,
    title,
    body,
    read: false,
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 30 * 24 * 60 * 60 * 1000
    ),
  };
}

// TODO: activer emails quand plan Blaze disponible
// function mailData(to: string[], subject: string, htmlBody: string, deptId: string): Record<string, unknown> {
//   return { to, message: { subject, html: `<p>${htmlBody}</p>`, text: htmlBody }, createdAt: admin.firestore.Timestamp.now(), deptId };
// }

// Sends confirmation of a recorded cotisation to the paying member.
export async function notifyPaymentRecorded(params: {
  db: DB;
  deptId: string;
  userId: string;
  userEmail: string;  // reserved for email — TODO: activer emails quand plan Blaze disponible
  cycleIndex: number;
  montant: number;
}): Promise<void> {
  const { db, deptId, userId, cycleIndex, montant } = params;
  const body = `Votre cotisation de ${montant.toLocaleString('fr-FR')} FCFA pour le cycle ${cycleIndex} a été enregistrée.`;
  try {
    const batch = db.batch();
    batch.set(
      db.collection(`departments/${deptId}/users/${userId}/notifications`).doc(),
      notifData('paiement_enregistre', 'Cotisation enregistrée', body)
    );
    // TODO: activer emails quand plan Blaze disponible
    // batch.set(db.collection('mail').doc(), mailData([params.userEmail], `Cotisation enregistrée — Cycle ${cycleIndex}`, body, deptId));
    await batch.commit();
  } catch (err) {
    console.error('notifyPaymentRecorded: batch failed', err);
  }
}

// Sends J-5 reminders: personal to each unpaid member, summary to admin+bureau.
// memberEmails and adminEmails are reserved for email delivery.
export async function notifyJ5(params: {
  db: DB;
  deptId: string;
  unpaidUids: string[];
  deadline: Timestamp;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  memberEmails: Record<string, string>;  // reserved — TODO: activer emails quand plan Blaze disponible
  adminEmails: string[];                 // reserved — TODO: activer emails quand plan Blaze disponible
}): Promise<void> {
  const { db, deptId, unpaidUids, deadline, cycleIndex, adminUids, bureauUids } = params;
  const dateStr = deadline
    .toDate()
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const memberBody = `Vous avez 5 jours pour cotiser. Deadline : ${dateStr}.`;
  const summaryBody = `Il reste ${unpaidUids.length} membre(s) à cotiser avant le ${dateStr} (cycle ${cycleIndex}).`;
  try {
    const batch = db.batch();
    for (const uid of unpaidUids) {
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData('rappel_j5', 'Rappel cotisation — J-5', memberBody)
      );
    }
    for (const uid of [...adminUids, ...bureauUids]) {
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData('rappel_j5', `J-5 : ${unpaidUids.length} membre(s) en attente`, summaryBody)
      );
    }
    // TODO: activer emails quand plan Blaze disponible
    // for (const uid of unpaidUids) { if (params.memberEmails[uid]) { batch.set(db.collection('mail').doc(), mailData([params.memberEmails[uid]], `Rappel cotisation — Cycle ${cycleIndex}`, memberBody, deptId)); } }
    // if (params.adminEmails.length > 0) { batch.set(db.collection('mail').doc(), mailData(params.adminEmails, `Tontine — ${unpaidUids.length} membre(s) en attente (J-5)`, summaryBody, deptId)); }
    await batch.commit();
  } catch (err) {
    console.error('notifyJ5: batch failed', err);
  }
}

// Sends "kitty complete" alert when closedBy === 'auto' (everyone paid).
// beneficiaryEmail and adminEmails are reserved for email delivery.
export async function notifyKittyComplete(params: {
  db: DB;
  deptId: string;
  beneficiaryUid: string;
  beneficiaryEmail: string;  // reserved — TODO: activer emails quand plan Blaze disponible
  montantVerse: number;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  adminEmails: string[];     // reserved — TODO: activer emails quand plan Blaze disponible
}): Promise<void> {
  const { db, deptId, beneficiaryUid, montantVerse, cycleIndex, adminUids, bureauUids } = params;
  const montantStr = montantVerse.toLocaleString('fr-FR');
  const benefBody = `La cagnotte est complète — ${montantStr} FCFA vous seront remis. Confirmez la réception une fois l'argent en main.`;
  const adminBody = `Cycle ${cycleIndex} clôturé automatiquement. Tous les membres ont cotisé. Le bénéficiaire peut être payé (${montantStr} FCFA). En attente de sa confirmation.`;
  try {
    const batch = db.batch();
    batch.set(
      db.collection(`departments/${deptId}/users/${beneficiaryUid}/notifications`).doc(),
      notifData('cagnotte_complete', 'Cagnotte complète !', benefBody)
    );
    for (const uid of [...adminUids, ...bureauUids]) {
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData('cagnotte_complete', `Cycle ${cycleIndex} clôturé`, adminBody)
      );
    }
    // TODO: activer emails quand plan Blaze disponible
    // batch.set(db.collection('mail').doc(), mailData([params.beneficiaryEmail], `Cagnotte complète — Cycle ${cycleIndex}`, benefBody, deptId));
    // if (params.adminEmails.length > 0) { batch.set(db.collection('mail').doc(), mailData(params.adminEmails, `Cycle ${cycleIndex} clôturé automatiquement`, adminBody, deptId)); }
    await batch.commit();
  } catch (err) {
    console.error('notifyKittyComplete: batch failed', err);
  }
}

// Sends late payment / penalty alerts when cycle closes with penalized members.
// newRanks: uid → new 1-based rank after memberOrder reorder.
// penalizedEmails and adminEmails are reserved for email delivery.
export async function notifyLatePayment(params: {
  db: DB;
  deptId: string;
  penalizedUids: string[];
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  penalizedEmails: Record<string, string>;  // reserved — TODO: activer emails quand plan Blaze disponible
  adminEmails: string[];                    // reserved — TODO: activer emails quand plan Blaze disponible
  newRanks: Record<string, number>;
}): Promise<void> {
  const { db, deptId, penalizedUids, cycleIndex, adminUids, bureauUids, newRanks } = params;
  const rankLines = penalizedUids
    .map((uid) => `• ${uid} → nouveau rang : ${newRanks[uid]}`)
    .join('<br>');
  const adminBody = `Cycle ${cycleIndex} clôturé avec ${penalizedUids.length} pénalité(s).<br>${rankLines}`;
  try {
    const batch = db.batch();
    for (const uid of penalizedUids) {
      const rank = newRanks[uid];
      const body = `Vous n'avez pas cotisé à temps pour le cycle ${cycleIndex}. Pénalité appliquée — nouveau rang : ${rank}.`;
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData('penalite_appliquee', 'Pénalité appliquée', body)
      );
      // TODO: activer emails quand plan Blaze disponible
      // if (params.penalizedEmails[uid]) { batch.set(db.collection('mail').doc(), mailData([params.penalizedEmails[uid]], `Pénalité — Cycle ${cycleIndex}`, body, deptId)); }
    }
    for (const uid of [...adminUids, ...bureauUids]) {
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData(
          'penalite_appliquee',
          `${penalizedUids.length} pénalité(s) — Cycle ${cycleIndex}`,
          adminBody
        )
      );
    }
    // TODO: activer emails quand plan Blaze disponible
    // if (params.adminEmails.length > 0) { batch.set(db.collection('mail').doc(), mailData(params.adminEmails, `Pénalités cycle ${cycleIndex} — ${penalizedUids.length} membre(s)`, adminBody, deptId)); }
    await batch.commit();
  } catch (err) {
    console.error('notifyLatePayment: batch failed', err);
  }
}

// Sends confirmation receipt notification.
// Deliberate asymmetry:
// - Beneficiary → in-app only (no email by design: they just performed the action).
// - Admin & Bureau → in-app only for now; email reserved for when Blaze plan is active.
export async function notifyConfirmation(params: {
  db: DB;
  deptId: string;
  beneficiaryUid: string;
  beneficiaryName: string;
  montantVerse: number;
  cycleIndex: number;
  adminUids: string[];
  bureauUids: string[];
  adminEmails: string[];  // reserved — TODO: activer emails quand plan Blaze disponible
}): Promise<void> {
  const { db, deptId, beneficiaryUid, beneficiaryName, montantVerse, cycleIndex, adminUids, bureauUids } = params;
  const montantStr = montantVerse.toLocaleString('fr-FR');
  const benefBody = `Votre confirmation de réception de ${montantStr} FCFA (cycle ${cycleIndex}) a bien été enregistrée. L'admin peut maintenant ouvrir le cycle suivant.`;
  const adminBody = `${beneficiaryName} a confirmé la réception de ${montantStr} FCFA (cycle ${cycleIndex}). Vous pouvez ouvrir le cycle suivant.`;
  try {
    const batch = db.batch();
    // In-app only for beneficiary — no email (they just performed the action; an email is redundant)
    batch.set(
      db.collection(`departments/${deptId}/users/${beneficiaryUid}/notifications`).doc(),
      notifData('beneficiaire_confirme', 'Réception confirmée', benefBody)
    );
    for (const uid of [...adminUids, ...bureauUids]) {
      batch.set(
        db.collection(`departments/${deptId}/users/${uid}/notifications`).doc(),
        notifData('beneficiaire_confirme', `${beneficiaryName} a confirmé la réception`, adminBody)
      );
    }
    // TODO: activer emails quand plan Blaze disponible
    // if (params.adminEmails.length > 0) { batch.set(db.collection('mail').doc(), mailData(params.adminEmails, `Réception confirmée — Cycle ${cycleIndex}`, adminBody, deptId)); }
    await batch.commit();
  } catch (err) {
    console.error('notifyConfirmation: batch failed', err);
  }
}
```

- [ ] **Step 2: Verify functions TypeScript build**

Run: `cd functions && npm run build` from `.worktrees/feature-notifications/`
Expected: `Build succeeded` — zero TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/_notify.ts
git commit -m "feat(notifications): add _notify.ts shared helper module (5 helpers)"
```

---

## Task 3: `j5-reminder-cron.ts` — scheduled J-5 reminder

**Files:**
- Create: `functions/src/j5-reminder-cron.ts`

> Verified by TypeScript build. Follows the same `onSchedule` + `collectionGroup` pattern as `close-cycle-cron.ts`.
> The Firestore composite index `(status, deadline)` on `cycles` collection group already exists from the `closeCycleCron` function — no new index needed.

- [ ] **Step 1: Create `j5-reminder-cron.ts`**

```typescript
// functions/src/j5-reminder-cron.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { notifyJ5 } from './_notify.js';

export const j5RemindCron = onSchedule(
  {
    schedule: '0 7 * * *',  // 07:00 UTC = 08:00 Africa/Douala (UTC+1, no DST)
    timeZone: 'UTC',
  },
  async () => {
    const db = admin.firestore();

    // Compute deadline window: calendar day D+5 in Africa/Douala.
    // Africa/Douala = UTC+1, so midnight D+5 Africa/Douala = D+4 at 23:00 UTC.
    // Query: deadline >= [D+4 at 23:00 UTC] and deadline < [D+5 at 23:00 UTC].
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() + 4);
    windowStart.setUTCHours(23, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

    const snapshot = await db
      .collectionGroup('cycles')
      .where('status', '==', 'open')
      .where('deadline', '>=', admin.firestore.Timestamp.fromDate(windowStart))
      .where('deadline', '<', admin.firestore.Timestamp.fromDate(windowEnd))
      .get();

    if (snapshot.empty) {
      logger.info('j5RemindCron: aucun cycle à notifier.');
      return;
    }

    logger.info(`j5RemindCron: ${snapshot.size} cycle(s) à notifier.`);

    const tasks = snapshot.docs.map(async (cycleDoc) => {
      // Path: departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}
      const pathSegments = cycleDoc.ref.path.split('/');
      const deptId = pathSegments[1];
      const saisonId = pathSegments[3];
      const cycleId = pathSegments[5];
      const cycle = cycleDoc.data();

      try {
        // Read cotisations — collect unpaid UIDs
        const cotisationsSnap = await db
          .collection(
            `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
          )
          .get();

        const unpaidUids: string[] = [];
        cotisationsSnap.forEach((doc) => {
          if (!doc.data()['paid']) unpaidUids.push(doc.id);
        });

        if (unpaidUids.length === 0) {
          logger.info(`j5RemindCron: cycle ${cycleId} — tous ont payé, skip.`);
          return;
        }

        // Read dept users — collect admin/bureau UIDs and emails
        const usersSnap = await db
          .collection(`departments/${deptId}/users`)
          .get();

        const adminUids: string[] = [];
        const bureauUids: string[] = [];
        const adminEmails: string[] = [];  // combined admin + bureau emails
        const memberEmails: Record<string, string> = {};

        usersSnap.forEach((doc) => {
          const data = doc.data();
          const email = data['email'] as string;
          const role = data['role'] as string;
          if (role === 'admin') {
            adminUids.push(doc.id);
            adminEmails.push(email);
          }
          if (role === 'bureau') {
            bureauUids.push(doc.id);
            adminEmails.push(email);
          }
          if (unpaidUids.includes(doc.id)) {
            memberEmails[doc.id] = email;
          }
        });

        await notifyJ5({
          db,
          deptId,
          unpaidUids,
          deadline: cycle['deadline'],
          cycleIndex: cycle['index'] as number,
          adminUids,
          bureauUids,
          memberEmails,
          adminEmails,
        });

        logger.info(
          `j5RemindCron: cycle ${cycleId} notifié (${unpaidUids.length} impayés).`
        );
      } catch (err) {
        logger.error(`j5RemindCron: erreur cycle ${cycleId}`, err);
      }
    });

    await Promise.allSettled(tasks);
  }
);
```

- [ ] **Step 2: Verify functions TypeScript build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/j5-reminder-cron.ts
git commit -m "feat(notifications): add j5-reminder-cron scheduled function (08:00 Africa/Douala)"
```

---

## Task 4: Modify `mark-cotisation-paid.ts`

**Files:**
- Modify: `functions/src/mark-cotisation-paid.ts`

> Adds `notifyPaymentRecorded` call after the existing transaction. The transaction return is expanded to include `montantCotisation` and `cycleIndex` so the notify call has the data it needs without extra reads.

- [ ] **Step 1: Replace the file contents**

```typescript
// functions/src/mark-cotisation-paid.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { closeCycle } from './_close-cycle.js';
import { notifyPaymentRecorded } from './_notify.js';

export const markCotisationPaid = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const deptId = request.auth.token['deptId'] as string | undefined;
  if (!deptId) {
    throw new HttpsError('failed-precondition', 'Aucun département associé.');
  }

  const callerSnap = await admin
    .firestore()
    .doc(`departments/${deptId}/users/${request.auth.uid}`)
    .get();
  const callerRole = callerSnap.data()?.['role'];
  if (callerRole !== 'admin' && callerRole !== 'bureau') {
    throw new HttpsError('permission-denied', 'Rôle admin ou bureau requis.');
  }

  const { saisonId, cycleId, userId } = request.data as {
    saisonId: string;
    cycleId: string;
    userId: string;
  };

  if (!saisonId || !cycleId || !userId) {
    throw new HttpsError('invalid-argument', 'saisonId, cycleId et userId requis.');
  }

  const db = admin.firestore();
  const cotisationRef = db.doc(
    `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations/${userId}`
  );
  const cycleRef = db.doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`);
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const now = admin.firestore.Timestamp.now();

  // Transaction: write cotisation + increment totalPaid atomically.
  // Returns values needed for auto-close check and notification.
  const txResult = await db.runTransaction(async (txn) => {
    const [cotisationSnap, cycleSnap, saisonSnap] = await Promise.all([
      txn.get(cotisationRef),
      txn.get(cycleRef),
      txn.get(saisonRef),
    ]);

    if (cycleSnap.data()?.['status'] !== 'open') {
      throw new HttpsError('failed-precondition', 'Ce cycle est déjà fermé.');
    }
    if (cotisationSnap.exists && cotisationSnap.data()?.['paid'] === true) {
      throw new HttpsError('already-exists', 'Cotisation déjà enregistrée pour ce membre.');
    }

    const currentTotalPaid: number = cycleSnap.data()?.['totalPaid'] ?? 0;
    const updatedTotalPaid = currentTotalPaid + 1;

    txn.set(cotisationRef, {
      paid: true,
      paidAt: now,
      recordedBy: request.auth!.uid,
      penalized: false,
      penaltyAppliedAt: null,
    });
    txn.update(cycleRef, { totalPaid: updatedTotalPaid });

    return {
      updatedTotalPaid,
      totalCycles: saisonSnap.data()?.['totalCycles'] as number,
      montantCotisation: saisonSnap.data()?.['montantCotisation'] as number,
      cycleIndex: cycleSnap.data()?.['index'] as number,
    };
  });

  // Auto-close if all members have paid (outside transaction to avoid nesting)
  if (txResult.updatedTotalPaid === txResult.totalCycles) {
    await closeCycle(db, deptId, saisonId, cycleId, 'auto');
  }

  // Notify the paying member — fetch their email from their profile
  const userSnap = await db.doc(`departments/${deptId}/users/${userId}`).get();
  const userEmail = (userSnap.data()?.['email'] as string) ?? '';
  await notifyPaymentRecorded({
    db,
    deptId,
    userId,
    userEmail,
    cycleIndex: txResult.cycleIndex,
    montant: txResult.montantCotisation,
  });

  return { success: true };
});
```

- [ ] **Step 2: Verify functions TypeScript build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/mark-cotisation-paid.ts
git commit -m "feat(notifications): notify paying member after cotisation recorded"
```

---

## Task 5: Modify `_close-cycle.ts`

**Files:**
- Modify: `functions/src/_close-cycle.ts`

> The transaction now returns a typed result (`txResult`) so `notifyKittyComplete` / `notifyLatePayment` can be called after it. When the anti-double-execution guard fires (cycle already closed), the transaction returns `null` and notifications are skipped. `adminEmails` receives both admin and bureau email addresses.

- [ ] **Step 1: Replace the file contents**

```typescript
// functions/src/_close-cycle.ts
import * as admin from 'firebase-admin';
import { notifyKittyComplete, notifyLatePayment } from './_notify.js';

/**
 * Ferme atomiquement un cycle via une transaction Firestore unique.
 * Protection anti-double exécution : ré-lit cycle.status dans la transaction.
 * Appelée par markCotisationPaid (auto), forceCloseCycle (admin), closeCycleCron (cron).
 */
export async function closeCycle(
  db: admin.firestore.Firestore,
  deptId: string,
  saisonId: string,
  cycleId: string,
  closedBy: 'auto' | 'admin' | 'cron'
): Promise<void> {
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const cycleRef = db.doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`);
  const cotisationsRef = db.collection(
    `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
  );

  // Transaction returns data needed for notifications, or null if already closed.
  const txResult = await db.runTransaction(async (txn) => {
    const [cycleSnap, saisonSnap, cotisationsSnap] = await Promise.all([
      txn.get(cycleRef),
      txn.get(saisonRef),
      txn.get(cotisationsRef),
    ]);

    // Anti-double-execution guard
    if (!cycleSnap.exists || cycleSnap.data()!.status === 'closed') return null;

    const cycle = cycleSnap.data()!;
    const saison = saisonSnap.data()!;
    const now = admin.firestore.Timestamp.now();

    const totalPaid: number = cycle['totalPaid'];
    const memberCount: number = saison['totalCycles'];
    const montantCotisation: number = saison['montantCotisation'];

    const montantVerse = totalPaid * montantCotisation;
    const montantCaisse = (memberCount - totalPaid) * montantCotisation;

    // Identify unpaid members and penalize them
    const penalizedUids: string[] = [];
    cotisationsSnap.forEach((docSnap) => {
      if (!docSnap.data()['paid']) {
        penalizedUids.push(docSnap.id);
        txn.update(docSnap.ref, {
          penalized: true,
          penaltyAppliedAt: now,
        });
      }
    });

    // Reorder memberOrder: non-penalized first (relative order preserved), then penalized
    const currentOrder: string[] = saison['memberOrder'];
    const newOrder = [
      ...currentOrder.filter((uid) => !penalizedUids.includes(uid)),
      ...penalizedUids,
    ];

    // Update cycle
    txn.update(cycleRef, {
      status: 'closed',
      closedAt: now,
      closedBy,
      montantVerse,
      montantCaisse,
    });

    // Update saison memberOrder (and optionally mark completed)
    const saisonUpdate: Record<string, unknown> = { memberOrder: newOrder };
    if (cycle['index'] === saison['totalCycles']) {
      saisonUpdate['status'] = 'completed';
      saisonUpdate['completedAt'] = now;
    }
    txn.update(saisonRef, saisonUpdate);

    return {
      penalizedUids,
      newOrder,
      beneficiaryUid: cycle['beneficiaryUid'] as string,
      montantVerse,
      cycleIndex: cycle['index'] as number,
    };
  });

  // Transaction returned null → cycle was already closed, skip notifications
  if (!txResult) return;

  // Fetch dept users once for notification recipients
  const usersSnap = await db.collection(`departments/${deptId}/users`).get();
  const adminUids: string[] = [];
  const bureauUids: string[] = [];
  const adminEmails: string[] = [];  // combined admin + bureau emails
  let beneficiaryEmail = '';
  const penalizedEmails: Record<string, string> = {};

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const email = data['email'] as string;
    const role = data['role'] as string;
    if (role === 'admin') {
      adminUids.push(doc.id);
      adminEmails.push(email);
    }
    if (role === 'bureau') {
      bureauUids.push(doc.id);
      adminEmails.push(email);
    }
    if (doc.id === txResult.beneficiaryUid) beneficiaryEmail = email;
    if (txResult.penalizedUids.includes(doc.id)) penalizedEmails[doc.id] = email;
  });

  // Compute 1-based ranks from the updated memberOrder
  const newRanks: Record<string, number> = {};
  txResult.newOrder.forEach((uid, idx) => {
    newRanks[uid] = idx + 1;
  });

  // closedBy === 'auto' means everyone paid → kitty complete (zero penalized)
  if (closedBy === 'auto') {
    await notifyKittyComplete({
      db,
      deptId,
      beneficiaryUid: txResult.beneficiaryUid,
      beneficiaryEmail,
      montantVerse: txResult.montantVerse,
      cycleIndex: txResult.cycleIndex,
      adminUids,
      bureauUids,
      adminEmails,
    });
  }

  // Any closedBy: fire late payment alert if there are penalized members
  if (txResult.penalizedUids.length > 0) {
    await notifyLatePayment({
      db,
      deptId,
      penalizedUids: txResult.penalizedUids,
      cycleIndex: txResult.cycleIndex,
      adminUids,
      bureauUids,
      penalizedEmails,
      adminEmails,
      newRanks,
    });
  }
}
```

- [ ] **Step 2: Verify functions TypeScript build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/_close-cycle.ts
git commit -m "feat(notifications): add kitty-complete and late-payment notifications to _close-cycle"
```

---

## Task 6: Modify `confirm-reception.ts`

**Files:**
- Modify: `functions/src/confirm-reception.ts`

> Adds `notifyConfirmation` after the existing confirmation write. Fetches beneficiary displayName + all dept users for admin/bureau recipients.

- [ ] **Step 1: Replace the file contents**

```typescript
// functions/src/confirm-reception.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { notifyConfirmation } from './_notify.js';

export const confirmReception = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const deptId = request.auth.token['deptId'] as string | undefined;
  if (!deptId) {
    throw new HttpsError('failed-precondition', 'Aucun département associé.');
  }

  const { saisonId, cycleId } = request.data as { saisonId: string; cycleId: string };
  if (!saisonId || !cycleId) {
    throw new HttpsError('invalid-argument', 'saisonId et cycleId requis.');
  }

  const db = admin.firestore();
  const cycleSnap = await db
    .doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`)
    .get();

  if (!cycleSnap.exists) {
    throw new HttpsError('not-found', 'Cycle introuvable.');
  }

  const cycle = cycleSnap.data()!;

  if (cycle['status'] !== 'closed') {
    throw new HttpsError(
      'failed-precondition',
      'Le cycle doit être fermé pour confirmer la réception.'
    );
  }

  if (request.auth.uid !== cycle['beneficiaryUid']) {
    throw new HttpsError('permission-denied', 'Seul le bénéficiaire peut confirmer la réception.');
  }

  if (cycle['confirmedAt'] !== null && cycle['confirmedAt'] !== undefined) {
    throw new HttpsError('already-exists', 'Réception déjà confirmée.');
  }

  await cycleSnap.ref.update({
    confirmedAt: admin.firestore.Timestamp.now(),
    confirmedBy: request.auth.uid,
  });

  // Fetch beneficiary displayName
  const benefSnap = await db
    .doc(`departments/${deptId}/users/${request.auth.uid}`)
    .get();
  const beneficiaryName =
    (benefSnap.data()?.['displayName'] as string) ?? 'Le bénéficiaire';

  // Fetch dept users for admin/bureau notification recipients
  const usersSnap = await db.collection(`departments/${deptId}/users`).get();
  const adminUids: string[] = [];
  const bureauUids: string[] = [];
  const adminEmails: string[] = [];  // combined admin + bureau emails

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const email = data['email'] as string;
    const role = data['role'] as string;
    if (role === 'admin') {
      adminUids.push(doc.id);
      adminEmails.push(email);
    }
    if (role === 'bureau') {
      bureauUids.push(doc.id);
      adminEmails.push(email);
    }
  });

  await notifyConfirmation({
    db,
    deptId,
    beneficiaryUid: request.auth.uid,
    beneficiaryName,
    montantVerse: cycle['montantVerse'] as number,
    cycleIndex: cycle['index'] as number,
    adminUids,
    bureauUids,
    adminEmails,
  });

  return { success: true };
});
```

- [ ] **Step 2: Verify functions TypeScript build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/confirm-reception.ts
git commit -m "feat(notifications): notify admin/bureau + beneficiary after reception confirmed"
```

---

## Task 7: Export `j5RemindCron` + Firestore rules + functions final build

**Files:**
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`

- [ ] **Step 1: Add export to `index.ts`**

Replace `functions/src/index.ts` with:

```typescript
// functions/src/index.ts
import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions';

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

export { validateInvitation, acceptInvitation } from './accept-invitation.js';
export { createManagedUser } from './create-managed-user.js';
export { provisionDepartment } from './provision-department.js';

// Cycles module
export { createSaison } from './create-saison.js';
export { markCotisationPaid } from './mark-cotisation-paid.js';
export { forceCloseCycle } from './force-close-cycle.js';
export { openNextCycle } from './open-next-cycle.js';
export { confirmReception } from './confirm-reception.js';
export { closeCycleCron } from './close-cycle-cron.js';

// Notifications module
export { j5RemindCron } from './j5-reminder-cron.js';
```

- [ ] **Step 2: Update Firestore security rules**

In `firestore.rules`, replace the existing `match /users/{userId}` block inside `/departments/{deptId}` with the version below (adds the nested notifications subcollection). Also add the `/mail` block at the root level before the closing brace of `match /databases/{database}/documents`.

The full updated `firestore.rules`:

```
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

        // Per-user notifications — written by Admin SDK, read/mark-read by owner only
        match /notifications/{notifId} {
          allow read: if request.auth.uid == userId && inDept(deptId);
          allow update: if request.auth.uid == userId
                        && inDept(deptId)
                        && request.resource.data.diff(resource.data)
                           .affectedKeys().hasOnly(['read']);
          // create and delete: Admin SDK only
        }
      }

      // Invitations — créées par l'admin, lues par tout utilisateur authentifié non expiré
      match /invitations/{token} {
        allow read: if isAuthenticated()
                    && request.time < resource.data.expiresAt;
        allow create: if isAdminOfDept(deptId);
        allow update: if isSuperAdmin();
        allow delete: if isAdminOfDept(deptId) || isSuperAdmin();
      }

      // Saisons — membres lisent ; écritures via Admin SDK uniquement
      match /saisons/{saisonId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if false;

        // Cycles — membres lisent ; écritures via Admin SDK uniquement
        match /cycles/{cycleId} {
          allow read: if inDept(deptId) || isSuperAdmin();
          allow write: if false;

          // Cotisations — membres lisent ; écritures via Admin SDK uniquement
          match /cotisations/{userId} {
            allow read: if inDept(deptId) || isSuperAdmin();
            allow write: if false;
          }
        }
      }

      // Caisse (stub)
      match /caisse/{transactionId} {
        allow read: if inDept(deptId) || isSuperAdmin();
        allow write: if (inDept(deptId) && getUserRole(deptId) in ['admin', 'bureau'])
                     || isSuperAdmin();
      }
    }

    // Demandes de création de département — écriture publique
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

    // Email queue consumed by Firebase Trigger Email extension — Admin SDK only
    match /mail/{docId} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 3: Final functions build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add functions/src/index.ts firestore.rules
git commit -m "feat(notifications): export j5RemindCron, add Firestore rules for notifications and /mail"
```

---

## Task 8: TDD — `NotificationService`

**Files:**
- Create: `src/app/core/services/notification.service.spec.ts`
- Create: `src/app/core/services/notification.service.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/core/services/notification.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  collectionData,
  doc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { of } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationDoc } from '../models/notification.model';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  collectionData: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

const mockNotif: NotificationDoc = {
  id: 'notif-1',
  type: 'rappel_j5',
  title: 'Rappel',
  body: 'Vous avez 5 jours',
  read: false,
  createdAt: { seconds: 1000, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchNotifications() should return observable of notifications', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (orderBy as jest.Mock).mockReturnValue('orderByClause');
    (limit as jest.Mock).mockReturnValue('limitClause');
    (collectionData as jest.Mock).mockReturnValue(of([mockNotif]));

    service.watchNotifications('dept-1', 'uid-1').subscribe((notifs) => {
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('rappel_j5');
      done();
    });
  });

  it('markAsRead() should call updateDoc with { read: true }', async () => {
    (doc as jest.Mock).mockReturnValue('docRef');
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    await service.markAsRead('dept-1', 'uid-1', 'notif-1');

    expect(doc).toHaveBeenCalledWith(
      expect.anything(),
      'departments/dept-1/users/uid-1/notifications/notif-1'
    );
    expect(updateDoc).toHaveBeenCalledWith('docRef', { read: true });
  });

  it('markAllAsRead() should use a single batch for multiple notifIds', async () => {
    const mockUpdate = jest.fn();
    const mockCommit = jest.fn().mockResolvedValue(undefined);
    (writeBatch as jest.Mock).mockReturnValue({ update: mockUpdate, commit: mockCommit });
    (doc as jest.Mock).mockReturnValue('docRef');

    await service.markAllAsRead('dept-1', 'uid-1', ['notif-1', 'notif-2']);

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith('docRef', { read: true });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('markAllAsRead() should resolve immediately when notifIds is empty', async () => {
    await expect(service.markAllAsRead('dept-1', 'uid-1', [])).resolves.toBeUndefined();
    expect(writeBatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest notification.service --no-coverage`
Expected: FAIL — `Cannot find module './notification.service'`

- [ ] **Step 3: Implement `NotificationService`**

```typescript
// src/app/core/services/notification.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { NotificationDoc } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);

  watchNotifications(deptId: string, uid: string): Observable<NotificationDoc[]> {
    const ref = collection(
      this.firestore,
      `departments/${deptId}/users/${uid}/notifications`
    );
    const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
    return collectionData(q, { idField: 'id' }) as Observable<NotificationDoc[]>;
  }

  markAsRead(deptId: string, uid: string, notifId: string): Promise<void> {
    const ref = doc(
      this.firestore,
      `departments/${deptId}/users/${uid}/notifications/${notifId}`
    );
    return updateDoc(ref, { read: true });
  }

  markAllAsRead(deptId: string, uid: string, notifIds: string[]): Promise<void> {
    if (notifIds.length === 0) return Promise.resolve();
    const batch = writeBatch(this.firestore);
    for (const notifId of notifIds) {
      const ref = doc(
        this.firestore,
        `departments/${deptId}/users/${uid}/notifications/${notifId}`
      );
      batch.update(ref, { read: true });
    }
    return batch.commit();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest notification.service --no-coverage`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/notification.service.ts src/app/core/services/notification.service.spec.ts
git commit -m "feat(notifications): add NotificationService (watchNotifications, markAsRead, markAllAsRead)"
```

---

## Task 9: TDD — `NotificationBellComponent`

**Files:**
- Create: `src/app/shared/components/notification-bell/notification-bell.component.spec.ts`
- Create: `src/app/shared/components/notification-bell/notification-bell.component.ts`
- Create: `src/app/shared/components/notification-bell/notification-bell.component.html`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/shared/components/notification-bell/notification-bell.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc } from '../../../core/models/notification.model';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeNotif = (id: string, read: boolean): NotificationDoc => ({
  id,
  type: 'rappel_j5',
  title: 'T',
  body: 'B',
  read,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
});

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let notifServiceMock: jest.Mocked<Pick<NotificationService, 'watchNotifications'>>;

  beforeEach(async () => {
    notifServiceMock = {
      watchNotifications: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notifServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    component.deptId = 'dept-1';
    component.uid = 'uid-1';
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('unreadCount should be 0 when all notifications are read', () => {
    component.notifications.set([makeNotif('n1', true), makeNotif('n2', true)]);
    expect(component.unreadCount()).toBe(0);
  });

  it('unreadCount should count only unread notifications', () => {
    component.notifications.set([
      makeNotif('n1', false),
      makeNotif('n2', true),
      makeNotif('n3', false),
    ]);
    expect(component.unreadCount()).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest notification-bell --no-coverage`
Expected: FAIL — `Cannot find module './notification-bell.component'`

- [ ] **Step 3: Implement `NotificationBellComponent`**

```typescript
// src/app/shared/components/notification-bell/notification-bell.component.ts
import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { NotificationDoc } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    NotificationPanelComponent,
  ],
  templateUrl: './notification-bell.component.html',
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

```html
<!-- src/app/shared/components/notification-bell/notification-bell.component.html -->
<button
  mat-icon-button
  [matMenuTriggerFor]="notifMenu"
  [matBadge]="unreadCount()"
  [matBadgeHidden]="unreadCount() === 0"
  matBadgeColor="warn"
  aria-label="Notifications">
  <mat-icon>notifications</mat-icon>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest notification-bell --no-coverage`
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/notification-bell/
git commit -m "feat(notifications): add NotificationBellComponent (badge + mat-menu trigger)"
```

---

## Task 10: TDD — `NotificationPanelComponent`

**Files:**
- Create: `src/app/shared/components/notification-panel/notification-panel.component.spec.ts`
- Create: `src/app/shared/components/notification-panel/notification-panel.component.ts`
- Create: `src/app/shared/components/notification-panel/notification-panel.component.html`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/shared/components/notification-panel/notification-panel.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationPanelComponent } from './notification-panel.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc } from '../../../core/models/notification.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeNotif = (id: string, type: NotificationDoc['type'], read = false): NotificationDoc => ({
  id,
  type,
  title: 'T',
  body: 'B',
  read,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
});

describe('NotificationPanelComponent', () => {
  let component: NotificationPanelComponent;
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let notifServiceMock: jest.Mocked<
    Pick<NotificationService, 'markAsRead' | 'markAllAsRead'>
  >;
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    notifServiceMock = {
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
    };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [NotificationPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notifServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    component.deptId = 'dept-1';
    component.uid = 'uid-1';
    component.notifications = [];
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('handleClick() should markAsRead and navigate to /app/cycles for rappel_j5', async () => {
    const notif = makeNotif('n1', 'rappel_j5');
    await component.handleClick(notif);
    expect(notifServiceMock.markAsRead).toHaveBeenCalledWith('dept-1', 'uid-1', 'n1');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/cycles']);
  });

  it('handleClick() should navigate to /app/cycles/history for penalite_appliquee', async () => {
    const notif = makeNotif('n2', 'penalite_appliquee');
    await component.handleClick(notif);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/cycles/history']);
  });

  it('handleMarkAll() should call markAllAsRead with unread notification ids', async () => {
    component.notifications = [
      makeNotif('n1', 'rappel_j5', false),
      makeNotif('n2', 'paiement_enregistre', true),
      makeNotif('n3', 'cagnotte_complete', false),
    ];
    await component.handleMarkAll();
    expect(notifServiceMock.markAllAsRead).toHaveBeenCalledWith(
      'dept-1',
      'uid-1',
      ['n1', 'n3']
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest notification-panel --no-coverage`
Expected: FAIL — `Cannot find module './notification-panel.component'`

- [ ] **Step 3: Implement `NotificationPanelComponent`**

```typescript
// src/app/shared/components/notification-panel/notification-panel.component.ts
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc, NotificationType } from '../../../core/models/notification.model';

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
  imports: [MatListModule, MatIconModule, MatButtonModule, MatDividerModule, NgClass],
  templateUrl: './notification-panel.component.html',
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

```html
<!-- src/app/shared/components/notification-panel/notification-panel.component.html -->
<div class="notif-panel" style="min-width: 320px; max-width: 400px;">
  @if (notifications.length === 0) {
    <div style="padding: 16px; text-align: center; color: #888;">
      Aucune notification.
    </div>
  } @else {
    <div style="padding: 8px 16px; display: flex; justify-content: flex-end;">
      <button mat-button (click)="handleMarkAll()">
        Tout marquer comme lu
      </button>
    </div>
    <mat-divider />
    <mat-list>
      @for (notif of notifications; track notif.id) {
        <mat-list-item
          (click)="handleClick(notif)"
          style="cursor: pointer;"
          [style.font-weight]="notif.read ? 'normal' : 'bold'">
          <mat-icon matListItemIcon>
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest notification-panel --no-coverage`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/notification-panel/
git commit -m "feat(notifications): add NotificationPanelComponent (list, navigate, mark-all-read)"
```

---

## Task 11: Wire bell into `AppShellComponent` + final build

**Files:**
- Modify: `src/app/shared/components/app-shell/app-shell.component.ts`
- Modify: `src/app/shared/components/app-shell/app-shell.component.html`

- [ ] **Step 1: Update `app-shell.component.ts`**

Replace with:

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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
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
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
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

- [ ] **Step 2: Update `app-shell.component.html`**

Replace with:

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
      @if (deptId() && uid()) {
        <app-notification-bell [deptId]="deptId()!" [uid]="uid()!" />
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

- [ ] **Step 3: Run all Angular tests**

Run: `npx jest --no-coverage`
Expected: all tests pass (existing 26 + new 11 = 37 tests)

- [ ] **Step 4: Run Angular production build**

Run: `npx ng build --configuration production`
Expected: `Application bundle generation complete` — zero errors

- [ ] **Step 5: Run functions build**

Run: `cd functions && npm run build`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/components/app-shell/app-shell.component.ts \
        src/app/shared/components/app-shell/app-shell.component.html
git commit -m "feat(notifications): wire NotificationBellComponent into AppShellComponent"
```

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

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

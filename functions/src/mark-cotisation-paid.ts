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

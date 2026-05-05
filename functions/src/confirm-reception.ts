import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

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

  const cycleSnap = await admin
    .firestore()
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

  return { success: true };
});

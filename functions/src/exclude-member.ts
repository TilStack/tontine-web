// functions/src/exclude-member.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const excludeMember = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { deptId, userId, reason } = request.data as {
    deptId: string;
    userId: string;
    reason: string;
  };
  if (!deptId || !userId) {
    throw new HttpsError('invalid-argument', 'deptId et userId requis.');
  }
  if (!reason?.trim()) throw new HttpsError('invalid-argument', 'reason requis.');

  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const saisonsSnap = await db
    .collection(`departments/${deptId}/saisons`)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  let activeSaisonRef: admin.firestore.DocumentReference | null = null;
  let currentMemberOrder: string[] = [];

  if (!saisonsSnap.empty) {
    const saisonDoc = saisonsSnap.docs[0];
    const saisonData = saisonDoc.data();
    activeSaisonRef = saisonDoc.ref;
    currentMemberOrder = saisonData['memberOrder'] as string[];
    const currentCycleIndex: number = saisonData['currentCycleIndex'];

    const openCyclesSnap = await db
      .collection(`departments/${deptId}/saisons/${saisonDoc.id}/cycles`)
      .where('status', '==', 'open')
      .limit(1)
      .get();

    if (!openCyclesSnap.empty && currentMemberOrder[currentCycleIndex] === userId) {
      throw new HttpsError(
        'failed-precondition',
        'Ce membre est bénéficiaire du cycle en cours et ne peut pas être exclu.'
      );
    }
  }

  const batch = db.batch();
  batch.delete(db.doc(`departments/${deptId}/users/${userId}`));

  if (activeSaisonRef && currentMemberOrder.includes(userId)) {
    batch.update(activeSaisonRef, {
      memberOrder: currentMemberOrder.filter((uid) => uid !== userId),
    });
  }

  await batch.commit();

  await db.collection('admin_logs').add({
    action: 'exclude_member',
    targetDeptId: deptId,
    targetId: userId,
    reason: reason.trim(),
    performedBy: request.auth.uid,
    performedAt: now,
  });

  return { success: true };
});

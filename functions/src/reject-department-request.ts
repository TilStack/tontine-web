// functions/src/reject-department-request.ts
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const rejectDepartmentRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }
  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { requestId, reason } = request.data as { requestId: string; reason: string };
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId requis.');
  if (!reason?.trim()) throw new HttpsError('invalid-argument', 'reason requis.');

  const ref = admin.firestore().collection('department_requests').doc(requestId);
  const snap = await ref.get();

  if (!snap.exists) throw new HttpsError('not-found', 'Demande introuvable.');
  if (snap.data()!['status'] !== 'pending') {
    throw new HttpsError('failed-precondition', 'Cette demande a déjà été traitée.');
  }

  const now = admin.firestore.Timestamp.now();
  await ref.update({
    status: 'rejected',
    rejectedAt: now,
    rejectionReason: reason.trim(),
  });

  return { success: true };
});

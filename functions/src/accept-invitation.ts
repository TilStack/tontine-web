import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

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

  batch.update(invitationRef, { used: true });
  await batch.commit();

  await admin.auth().setCustomUserClaims(uid, { deptId });

  return { success: true };
});

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const provisionDepartment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  if (request.auth.token['role'] !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Réservé au Super Admin.');
  }

  const { requestId } = request.data as { requestId: string };
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId requis.');

  const requestRef = admin.firestore().collection('department_requests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) throw new HttpsError('not-found', 'Demande introuvable.');

  const reqData = requestSnap.data()!;
  if (reqData['status'] !== 'pending') {
    throw new HttpsError('failed-precondition', 'Cette demande a déjà été traitée.');
  }

  const now = admin.firestore.Timestamp.now();
  const deptId = admin.firestore().collection('departments').doc().id;

  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

  const adminUser = await admin.auth().createUser({
    email: reqData['requesterEmail'] as string,
    displayName: reqData['requesterName'] as string,
    password: tempPassword,
  });

  await admin.auth().setCustomUserClaims(adminUser.uid, { deptId });

  const batch = admin.firestore().batch();

  const deptRef = admin.firestore().collection('departments').doc(deptId);
  batch.set(deptRef, {
    name: reqData['deptName'],
    adminId: adminUser.uid,
    status: 'active',
    createdAt: now,
    settings: {},
  });

  const userRef = deptRef.collection('users').doc(adminUser.uid);
  batch.set(userRef, {
    displayName: reqData['requesterName'],
    email: reqData['requesterEmail'],
    role: 'admin',
    rang: 0,
    hasBenefited: false,
    joinedAt: now,
    mustResetPassword: true,
  });

  batch.update(requestRef, { status: 'approved' });
  await batch.commit();

  const resetLink = await admin.auth().generatePasswordResetLink(
    reqData['requesterEmail'] as string
  );

  console.log(`Department ${deptId} provisioned. Admin reset link: ${resetLink}`);

  return { deptId, adminUid: adminUser.uid, resetLink };
});

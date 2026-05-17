import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export const createManagedUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentification requise.");
  }

  const callerDeptId = request.auth.token["deptId"] as string | undefined;
  if (!callerDeptId) {
    throw new HttpsError("permission-denied", "Pas de département associé.");
  }

  const callerDoc = await admin
    .firestore()
    .collection("departments")
    .doc(callerDeptId)
    .collection("users")
    .doc(request.auth.uid)
    .get();

  if (callerDoc.data()?.["role"] !== "admin") {
    throw new HttpsError("permission-denied", "Réservé aux admins de département.");
  }

  const {email, displayName, role} = request.data as {
    email: string;
    displayName: string;
    role: "bureau" | "membre";
  };

  if (!email || !displayName || !role) {
    throw new HttpsError("invalid-argument", "email, displayName et role requis.");
  }

  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

  const userRecord = await admin.auth().createUser({
    email,
    displayName,
    password: tempPassword,
  });

  await admin.auth().setCustomUserClaims(userRecord.uid, {deptId: callerDeptId});

  const now = admin.firestore.Timestamp.now();
  await admin
    .firestore()
    .collection("departments")
    .doc(callerDeptId)
    .collection("users")
    .doc(userRecord.uid)
    .set({
      displayName,
      email,
      role,
      rang: 0,
      hasBenefited: false,
      joinedAt: now,
      mustResetPassword: true,
    });

  const resetLink = await admin.auth().generatePasswordResetLink(email);
  console.log(`Reset link for ${email}: ${resetLink}`);

  return {uid: userRecord.uid, resetLink};
});

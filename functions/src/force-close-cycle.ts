import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {closeCycle} from "./_close-cycle.js";

export const forceCloseCycle = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentification requise.");
  }

  const deptId = request.auth.token["deptId"] as string | undefined;
  if (!deptId) {
    throw new HttpsError("failed-precondition", "Aucun département associé.");
  }

  const callerSnap = await admin
    .firestore()
    .doc(`departments/${deptId}/users/${request.auth.uid}`)
    .get();
  if (callerSnap.data()?.["role"] !== "admin") {
    throw new HttpsError("permission-denied", "Rôle admin requis.");
  }

  const {saisonId, cycleId} = request.data as { saisonId: string; cycleId: string };
  if (!saisonId || !cycleId) {
    throw new HttpsError("invalid-argument", "saisonId et cycleId requis.");
  }

  const cycleSnap = await admin
    .firestore()
    .doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`)
    .get();

  if (!cycleSnap.exists || cycleSnap.data()?.["status"] !== "open") {
    throw new HttpsError("failed-precondition", "Ce cycle n'est pas ouvert.");
  }

  await closeCycle(admin.firestore(), deptId, saisonId, cycleId, "admin");

  return {success: true};
});

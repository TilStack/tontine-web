// functions/src/force-saison-close.ts
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export const forceSaisonClose = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentification requise.");
  }
  if (request.auth.token["role"] !== "super_admin") {
    throw new HttpsError("permission-denied", "Réservé au Super Admin.");
  }

  const {deptId, saisonId, reason} = request.data as {
    deptId: string;
    saisonId: string;
    reason: string;
  };
  if (!deptId || !saisonId) {
    throw new HttpsError("invalid-argument", "deptId et saisonId requis.");
  }
  if (!reason?.trim()) throw new HttpsError("invalid-argument", "reason requis.");

  const db = admin.firestore();
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const saisonSnap = await saisonRef.get();

  if (!saisonSnap.exists) throw new HttpsError("not-found", "Saison introuvable.");
  if (saisonSnap.data()!["status"] !== "active") {
    throw new HttpsError("failed-precondition", "La saison n'est pas active.");
  }

  const now = admin.firestore.Timestamp.now();
  const batch = db.batch();

  const openCyclesSnap = await db
    .collection(`departments/${deptId}/saisons/${saisonId}/cycles`)
    .where("status", "==", "open")
    .limit(1)
    .get();

  if (!openCyclesSnap.empty) {
    batch.update(openCyclesSnap.docs[0].ref, {
      status: "closed",
      closedAt: now,
      closedBy: "super_admin",
    });
  }

  batch.update(saisonRef, {status: "completed", completedAt: now});
  await batch.commit();

  await db.collection("admin_logs").add({
    action: "force_close_saison",
    targetDeptId: deptId,
    targetId: saisonId,
    reason: reason.trim(),
    performedBy: request.auth.uid,
    performedAt: now,
  });

  return {success: true};
});

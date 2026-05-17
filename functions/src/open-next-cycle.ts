import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export const openNextCycle = onCall(async (request) => {
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

  const db = admin.firestore();
  const [cycleSnap, saisonSnap] = await Promise.all([
    db.doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`).get(),
    db.doc(`departments/${deptId}/saisons/${saisonId}`).get(),
  ]);

  const cycle = cycleSnap.data();
  const saison = saisonSnap.data();

  if (!cycle || cycle["status"] !== "closed") {
    throw new HttpsError(
      "failed-precondition",
      "Le cycle doit être fermé avant d'en ouvrir un nouveau."
    );
  }
  if (!cycle["confirmedAt"]) {
    throw new HttpsError(
      "failed-precondition",
      "Le bénéficiaire n'a pas encore confirmé la réception."
    );
  }
  if (!saison || saison["status"] !== "active") {
    throw new HttpsError("failed-precondition", "La saison est terminée ou inexistante.");
  }

  const nextIndex: number = saison["currentCycleIndex"] + 1;
  const memberOrder: string[] = saison["memberOrder"];

  if (nextIndex >= memberOrder.length) {
    throw new HttpsError("failed-precondition", "Tous les cycles de cette saison sont terminés.");
  }

  const nextBeneficiaryUid = memberOrder[nextIndex];
  const now = admin.firestore.Timestamp.now();

  // Deadline: 5th of next month at 23:59 UTC+1 (= 22:59 UTC)
  const d = now.toDate();
  const deadline = admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 5, 22, 59, 0))
  );

  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const newCycleRef = saisonRef.collection("cycles").doc();
  const batch = db.batch();

  batch.set(newCycleRef, {
    index: nextIndex + 1,
    beneficiaryUid: nextBeneficiaryUid,
    deadline,
    status: "open",
    closedAt: null,
    closedBy: null,
    totalPaid: 0,
    montantVerse: 0,
    montantCaisse: 0,
    confirmedAt: null,
    confirmedBy: null,
    createdAt: now,
  });

  batch.update(saisonRef, {currentCycleIndex: nextIndex});

  // Pre-populate cotisations for all members (paid: false)
  for (const uid of memberOrder) {
    const cotRef = newCycleRef.collection("cotisations").doc(uid);
    batch.set(cotRef, {
      paid: false,
      paidAt: null,
      recordedBy: null,
      penalized: false,
      penaltyAppliedAt: null,
    });
  }

  await batch.commit();

  return {cycleId: newCycleRef.id};
});

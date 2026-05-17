import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export const createSaison = onCall(async (request) => {
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

  const {mode, memberOrder, montantCotisation} = request.data as {
    mode: "lottery" | "fixed";
    memberOrder: string[];
    montantCotisation: number;
  };

  if (!mode || !memberOrder || memberOrder.length < 2 || !montantCotisation) {
    throw new HttpsError("invalid-argument", "mode, memberOrder (≥2) et montantCotisation requis.");
  }

  // Load all department members sorted by joinedAt ascending
  const usersSnap = await admin
    .firestore()
    .collection(`departments/${deptId}/users`)
    .orderBy("joinedAt", "asc")
    .get();

  const sortedUids = usersSnap.docs.map((d) => d.id);
  if (sortedUids.length < 2) {
    throw new HttpsError("failed-precondition", "Le département doit avoir au moins 2 membres.");
  }

  // Validate ranks 1 and 2 must be the 2 most senior members
  if (memberOrder[0] !== sortedUids[0] || memberOrder[1] !== sortedUids[1]) {
    throw new HttpsError(
      "failed-precondition",
      "Les rangs 1 et 2 doivent correspondre aux 2 membres les plus anciens."
    );
  }

  // Build final member order
  let finalOrder: string[];
  if (mode === "lottery") {
    // Fisher-Yates shuffle for ranks 3+
    const remaining = sortedUids.slice(2);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    finalOrder = [memberOrder[0], memberOrder[1], ...remaining];
  } else {
    finalOrder = memberOrder;
  }

  const totalCycles = finalOrder.length;
  const now = admin.firestore.Timestamp.now();

  // Deadline: 5th of next month at 23:59 UTC+1 (= 22:59 UTC)
  const d = now.toDate();
  const deadline = admin.firestore.Timestamp.fromDate(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 5, 22, 59, 0))
  );

  const db = admin.firestore();
  const saisonRef = db.collection(`departments/${deptId}/saisons`).doc();
  const cycleRef = saisonRef.collection("cycles").doc();

  const batch = db.batch();

  batch.set(saisonRef, {
    status: "active",
    mode,
    montantCotisation,
    memberOrder: finalOrder,
    totalCycles,
    currentCycleIndex: 0,
    completedAt: null,
    createdAt: now,
    createdBy: request.auth.uid,
  });

  batch.set(cycleRef, {
    index: 1,
    beneficiaryUid: finalOrder[0],
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

  // Pre-populate cotisations for all members (paid: false) so _closeCycle can find them
  for (const uid of finalOrder) {
    const cotRef = cycleRef.collection("cotisations").doc(uid);
    batch.set(cotRef, {
      paid: false,
      paidAt: null,
      recordedBy: null,
      penalized: false,
      penaltyAppliedAt: null,
    });
  }

  await batch.commit();

  return {saisonId: saisonRef.id, cycleId: cycleRef.id};
});

// functions/src/_close-cycle.ts
import * as admin from "firebase-admin";
import {notifyKittyComplete, notifyLatePayment} from "./_notify.js";

/**
 * Ferme atomiquement un cycle via une transaction Firestore unique.
 * Protection anti-double exécution : ré-lit cycle.status dans la transaction.
 * Appelée par markCotisationPaid (auto), forceCloseCycle (admin), closeCycleCron (cron).
 */
export async function closeCycle(
  db: admin.firestore.Firestore,
  deptId: string,
  saisonId: string,
  cycleId: string,
  closedBy: "auto" | "admin" | "cron"
): Promise<void> {
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const cycleRef = db.doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`);
  const cotisationsRef = db.collection(
    `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
  );

  // Transaction returns data needed for notifications, or null if already closed.
  const txResult = await db.runTransaction(async (txn) => {
    const [cycleSnap, saisonSnap, cotisationsSnap] = await Promise.all([
      txn.get(cycleRef),
      txn.get(saisonRef),
      txn.get(cotisationsRef),
    ]);

    // Anti-double-execution guard
    if (!cycleSnap.exists || cycleSnap.data()!.status === "closed") return null;

    const cycle = cycleSnap.data()!;
    const saison = saisonSnap.data()!;
    const now = admin.firestore.Timestamp.now();

    const totalPaid: number = cycle["totalPaid"];
    const memberCount: number = saison["totalCycles"];
    const montantCotisation: number = saison["montantCotisation"];

    const montantVerse = totalPaid * montantCotisation;
    const montantCaisse = (memberCount - totalPaid) * montantCotisation;

    // Identify unpaid members and penalize them
    const penalizedUids: string[] = [];
    cotisationsSnap.forEach((docSnap) => {
      if (!docSnap.data()["paid"]) {
        penalizedUids.push(docSnap.id);
        txn.update(docSnap.ref, {
          penalized: true,
          penaltyAppliedAt: now,
        });
      }
    });

    // Reorder memberOrder: non-penalized first (relative order preserved), then penalized
    const currentOrder: string[] = saison["memberOrder"];
    const newOrder = [
      ...currentOrder.filter((uid) => !penalizedUids.includes(uid)),
      ...penalizedUids,
    ];

    // Update cycle
    txn.update(cycleRef, {
      status: "closed",
      closedAt: now,
      closedBy,
      montantVerse,
      montantCaisse,
    });

    // Update saison memberOrder (and optionally mark completed)
    const saisonUpdate: {[key: string]: admin.firestore.FieldValue | string | Date | unknown[]} = {memberOrder: newOrder};
    if (cycle["index"] === saison["totalCycles"]) {
      saisonUpdate["status"] = "completed";
      saisonUpdate["completedAt"] = now;
    }
    txn.update(saisonRef, saisonUpdate as admin.firestore.UpdateData<admin.firestore.DocumentData>);

    // Update caisse: atomically increment solde and totalEntrees
    const caisseRef = db.doc(`departments/${deptId}/caisse`);
    txn.set(
      caisseRef,
      {
        solde: admin.firestore.FieldValue.increment(montantCaisse),
        totalEntrees: admin.firestore.FieldValue.increment(montantCaisse),
        totalSorties: admin.firestore.FieldValue.increment(0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );

    return {
      penalizedUids,
      newOrder,
      beneficiaryUid: cycle["beneficiaryUid"] as string,
      montantVerse,
      cycleIndex: cycle["index"] as number,
    };
  });

  // Transaction returned null → cycle was already closed, skip notifications
  if (!txResult) return;

  // Fetch dept users once for notification recipients
  const usersSnap = await db.collection(`departments/${deptId}/users`).get();
  const adminUids: string[] = [];
  const bureauUids: string[] = [];
  const adminEmails: string[] = []; // combined admin + bureau emails
  let beneficiaryEmail = "";
  const penalizedEmails: Record<string, string> = {};

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const email = data["email"] as string;
    const role = data["role"] as string;
    if (role === "admin") {
      adminUids.push(doc.id);
      adminEmails.push(email);
    }
    if (role === "bureau") {
      bureauUids.push(doc.id);
      adminEmails.push(email);
    }
    if (doc.id === txResult.beneficiaryUid) beneficiaryEmail = email;
    if (txResult.penalizedUids.includes(doc.id)) penalizedEmails[doc.id] = email;
  });

  // Compute 1-based ranks from the updated memberOrder
  const newRanks: Record<string, number> = {};
  txResult.newOrder.forEach((uid, idx) => {
    newRanks[uid] = idx + 1;
  });

  // closedBy === 'auto' means everyone paid → kitty complete (zero penalized)
  if (closedBy === "auto") {
    await notifyKittyComplete({
      db,
      deptId,
      beneficiaryUid: txResult.beneficiaryUid,
      beneficiaryEmail,
      montantVerse: txResult.montantVerse,
      cycleIndex: txResult.cycleIndex,
      adminUids,
      bureauUids,
      adminEmails,
    });
  }

  // Any closedBy: fire late payment alert if there are penalized members
  if (txResult.penalizedUids.length > 0) {
    await notifyLatePayment({
      db,
      deptId,
      penalizedUids: txResult.penalizedUids,
      cycleIndex: txResult.cycleIndex,
      adminUids,
      bureauUids,
      penalizedEmails,
      adminEmails,
      newRanks,
    });
  }
}

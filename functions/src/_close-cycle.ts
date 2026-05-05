import * as admin from 'firebase-admin';

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
  closedBy: 'auto' | 'admin' | 'cron'
): Promise<void> {
  const saisonRef = db.doc(`departments/${deptId}/saisons/${saisonId}`);
  const cycleRef = db.doc(`departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}`);
  const cotisationsRef = db.collection(
    `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
  );

  await db.runTransaction(async (txn) => {
    // Reads must come before writes in Firestore transactions
    const [cycleSnap, saisonSnap, cotisationsSnap] = await Promise.all([
      txn.get(cycleRef),
      txn.get(saisonRef),
      txn.get(cotisationsRef),
    ]);

    // Anti-double-execution guard
    if (!cycleSnap.exists || cycleSnap.data()!.status === 'closed') return;

    const cycle = cycleSnap.data()!;
    const saison = saisonSnap.data()!;
    const now = admin.firestore.Timestamp.now();

    const totalPaid: number = cycle['totalPaid'];
    const memberCount: number = saison['totalCycles'];
    const montantCotisation: number = saison['montantCotisation'];

    const montantVerse = totalPaid * montantCotisation;
    const montantCaisse = (memberCount - totalPaid) * montantCotisation;

    // Identify unpaid members and penalize them
    const penalizedUids: string[] = [];
    cotisationsSnap.forEach((docSnap) => {
      if (!docSnap.data()['paid']) {
        penalizedUids.push(docSnap.id);
        txn.update(docSnap.ref, {
          penalized: true,
          penaltyAppliedAt: now,
        });
      }
    });

    // Reorder memberOrder: non-penalized first (relative order preserved), then penalized
    const currentOrder: string[] = saison['memberOrder'];
    const newOrder = [
      ...currentOrder.filter((uid) => !penalizedUids.includes(uid)),
      ...penalizedUids,
    ];

    // Update cycle
    txn.update(cycleRef, {
      status: 'closed',
      closedAt: now,
      closedBy,
      montantVerse,
      montantCaisse,
    });

    // Update saison memberOrder (and optionally mark completed)
    const saisonUpdate: Record<string, unknown> = { memberOrder: newOrder };
    if (cycle['index'] === saison['totalCycles']) {
      saisonUpdate['status'] = 'completed';
      saisonUpdate['completedAt'] = now;
    }
    txn.update(saisonRef, saisonUpdate);
  });
}

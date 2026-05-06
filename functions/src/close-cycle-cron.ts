import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { closeCycle } from './_close-cycle.js';

export const closeCycleCron = onSchedule(
  {
    schedule: '1 0 * * *',
    timeZone: 'Africa/Douala',
  },
  async () => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Query all open cycles with expired deadline across all departments
    const snapshot = await db
      .collectionGroup('cycles')
      .where('status', '==', 'open')
      .where('deadline', '<', now)
      .get();

    if (snapshot.empty) {
      logger.info('closeCycleCron: aucun cycle expiré trouvé.');
      return;
    }

    logger.info(`closeCycleCron: ${snapshot.size} cycle(s) à fermer.`);

    const tasks = snapshot.docs.map(async (cycleDoc) => {
      // Path: departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}
      const pathSegments = cycleDoc.ref.path.split('/');
      const deptId = pathSegments[1];
      const saisonId = pathSegments[3];
      const cycleId = pathSegments[5];

      try {
        await closeCycle(db, deptId, saisonId, cycleId, 'cron');
        logger.info(`closeCycleCron: cycle ${cycleId} fermé (dept: ${deptId}).`);
      } catch (err) {
        logger.error(`closeCycleCron: erreur cycle ${cycleId}`, err);
      }
    });

    await Promise.allSettled(tasks);
  }
);

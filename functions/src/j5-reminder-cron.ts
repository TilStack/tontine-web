// functions/src/j5-reminder-cron.ts
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {notifyJ5} from "./_notify.js";

export const j5RemindCron = onSchedule(
  {
    schedule: "0 7 * * *", // 07:00 UTC = 08:00 Africa/Douala (UTC+1, no DST)
    timeZone: "UTC",
  },
  async () => {
    const db = admin.firestore();

    // Compute deadline window: calendar day D+5 in Africa/Douala.
    // Africa/Douala = UTC+1, so midnight D+5 Africa/Douala = D+4 at 23:00 UTC.
    // Query: deadline >= [D+4 at 23:00 UTC] and deadline < [D+5 at 23:00 UTC].
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() + 4);
    windowStart.setUTCHours(23, 0, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

    const snapshot = await db
      .collectionGroup("cycles")
      .where("status", "==", "open")
      .where("deadline", ">=", admin.firestore.Timestamp.fromDate(windowStart))
      .where("deadline", "<", admin.firestore.Timestamp.fromDate(windowEnd))
      .get();

    if (snapshot.empty) {
      logger.info("j5RemindCron: aucun cycle à notifier.");
      return;
    }

    logger.info(`j5RemindCron: ${snapshot.size} cycle(s) à notifier.`);

    const tasks = snapshot.docs.map(async (cycleDoc) => {
      // Path: departments/{deptId}/saisons/{saisonId}/cycles/{cycleId}
      const pathSegments = cycleDoc.ref.path.split("/");
      const deptId = pathSegments[1];
      const saisonId = pathSegments[3];
      const cycleId = pathSegments[5];
      const cycle = cycleDoc.data();

      try {
        // Read cotisations — collect unpaid UIDs
        const cotisationsSnap = await db
          .collection(
            `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
          )
          .get();

        const unpaidUids: string[] = [];
        cotisationsSnap.forEach((doc) => {
          if (!doc.data()["paid"]) unpaidUids.push(doc.id);
        });

        if (unpaidUids.length === 0) {
          logger.info(`j5RemindCron: cycle ${cycleId} — tous ont payé, skip.`);
          return;
        }

        // Read dept users — collect admin/bureau UIDs and emails
        const usersSnap = await db
          .collection(`departments/${deptId}/users`)
          .get();

        const adminUids: string[] = [];
        const bureauUids: string[] = [];
        const adminEmails: string[] = []; // combined admin + bureau emails
        const memberEmails: Record<string, string> = {};

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
          if (unpaidUids.includes(doc.id)) {
            memberEmails[doc.id] = email;
          }
        });

        await notifyJ5({
          db,
          deptId,
          unpaidUids,
          deadline: cycle["deadline"],
          cycleIndex: cycle["index"] as number,
          adminUids,
          bureauUids,
          memberEmails,
          adminEmails,
        });

        logger.info(
          `j5RemindCron: cycle ${cycleId} notifié (${unpaidUids.length} impayés).`
        );
      } catch (err) {
        logger.error(`j5RemindCron: erreur cycle ${cycleId}`, err);
      }
    });

    await Promise.allSettled(tasks);
  }
);

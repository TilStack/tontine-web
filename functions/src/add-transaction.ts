import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

const VALID_CATEGORIES = ["nourriture", "sortie", "evenement", "materiel", "autre"] as const;

export const addTransaction = onCall(
  {enforceAppCheck: false},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Non authentifié.");
    }

    const role = (request.auth.token as Record<string, unknown>)["role"] as string | undefined;
    if (role !== "admin" && role !== "bureau") {
      throw new HttpsError("permission-denied", "Accès réservé admin et bureau.");
    }

    const {deptId, montant, categorie, libelle} = request.data as {
      deptId: string;
      montant: number;
      categorie: string;
      libelle?: string;
    };

    if (!deptId) {
      throw new HttpsError("invalid-argument", "deptId requis.");
    }
    if (!montant || montant <= 0) {
      throw new HttpsError("invalid-argument", "Le montant doit être supérieur à 0.");
    }
    if (!VALID_CATEGORIES.includes(categorie as typeof VALID_CATEGORIES[number])) {
      throw new HttpsError("invalid-argument", `Catégorie invalide : ${categorie}`);
    }

    const db = admin.firestore();
    const caisseRef = db.doc(`departments/${deptId}/caisse`);
    const transactionsRef = db.collection(`departments/${deptId}/transactions`);

    await db.runTransaction(async (txn) => {
      const caisseSnap = await txn.get(caisseRef);
      const currentSolde: number = caisseSnap.exists ?
        (caisseSnap.data()!["solde"] as number) :
        0;

      if (currentSolde - montant < 0) {
        throw new HttpsError("failed-precondition", "Solde insuffisant.");
      }

      const newTxRef = transactionsRef.doc();
      txn.set(newTxRef, {
        montant,
        type: "debit",
        categorie,
        libelle: libelle ?? "",
        source: "manuel",
        cycleId: null,
        createdBy: request.auth!.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      txn.set(
        caisseRef,
        {
          solde: admin.firestore.FieldValue.increment(-montant),
          totalSorties: admin.firestore.FieldValue.increment(montant),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    });
  }
);

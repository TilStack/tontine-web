import { Timestamp } from 'firebase/firestore';

export type CategorieType = 'nourriture' | 'sortie' | 'evenement' | 'materiel' | 'autre';

export interface CaisseDoc {
  solde: number;
  totalEntrees: number;
  totalSorties: number;
  updatedAt: Timestamp;
}

export interface TransactionDoc {
  id: string;
  montant: number;
  type: 'credit' | 'debit';
  categorie: CategorieType;
  libelle: string;
  source: 'cycle' | 'manuel';
  cycleId: string | null;
  createdBy: string;
  createdAt: Timestamp;
}

export interface AddTransactionPayload {
  deptId: string;
  montant: number;
  categorie: CategorieType;
  libelle?: string;
}

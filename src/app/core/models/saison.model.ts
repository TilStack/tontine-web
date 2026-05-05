import { Timestamp } from 'firebase/firestore';

export type SaisonMode = 'lottery' | 'fixed';
export type SaisonStatus = 'active' | 'completed';

export interface Saison {
  id: string;
  status: SaisonStatus;
  mode: SaisonMode;
  montantCotisation: number;
  memberOrder: string[];
  totalCycles: number;
  currentCycleIndex: number;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  createdBy: string;
}

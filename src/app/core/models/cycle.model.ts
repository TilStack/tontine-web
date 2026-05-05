import { Timestamp } from 'firebase/firestore';

export type CycleStatus = 'open' | 'closed';
export type ClosedBy = 'auto' | 'admin' | 'cron';

export interface Cycle {
  id: string;
  index: number;
  beneficiaryUid: string;
  deadline: Timestamp;
  status: CycleStatus;
  closedAt: Timestamp | null;
  closedBy: ClosedBy | null;
  totalPaid: number;
  montantVerse: number;
  montantCaisse: number;
  confirmedAt: Timestamp | null;
  confirmedBy: string | null;
  createdAt: Timestamp;
}

export interface Cotisation {
  uid: string;
  paid: boolean;
  paidAt: Timestamp | null;
  recordedBy: string | null;
  penalized: boolean;
  penaltyAppliedAt: Timestamp | null;
}

export interface ActiveCycleData {
  cycle: Cycle;
  cotisations: Cotisation[];
}

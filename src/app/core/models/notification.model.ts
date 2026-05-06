import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'rappel_j5'
  | 'paiement_enregistre'
  | 'cagnotte_complete'
  | 'penalite_appliquee'
  | 'beneficiaire_confirme'
  | 'cycle_ouvert'    // reserved — not triggered in this module
  | 'cycle_cloture';  // reserved — not triggered in this module

export interface NotificationDoc {
  id: string;  // added via collectionData idField
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

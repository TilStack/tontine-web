import { Timestamp } from 'firebase/firestore';

export type AdminLogAction = 'force_close_saison' | 'exclude_member';

export interface AdminLog {
  id: string;
  action: AdminLogAction;
  targetDeptId: string;
  targetId: string;
  reason: string;
  performedBy: string;
  performedAt: Timestamp;
}

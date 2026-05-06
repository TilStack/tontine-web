import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user.model';

export interface Invitation {
  token: string;
  email: string;
  role: UserRole;
  createdBy: string;
  expiresAt: Timestamp;
  used: boolean;
  deptId: string;
}

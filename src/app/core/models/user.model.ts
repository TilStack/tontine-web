import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'bureau' | 'membre';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  rang: number;
  hasBenefited: boolean;
  joinedAt: Timestamp;
  mustResetPassword: boolean;
}

export interface UserClaims {
  deptId: string;
  role?: 'super_admin';
}

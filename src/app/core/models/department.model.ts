import { Timestamp } from 'firebase/firestore';

export type DepartmentStatus = 'active' | 'pending';

export interface Department {
  id: string;
  name: string;
  adminId: string;
  status: DepartmentStatus;
  createdAt: Timestamp;
  settings: Record<string, unknown>;
}

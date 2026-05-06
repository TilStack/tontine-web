import { Timestamp } from 'firebase/firestore';

export type DepartmentRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DepartmentRequest {
  id: string;
  requesterEmail: string;
  requesterName: string;
  deptName: string;
  message: string;
  status: DepartmentRequestStatus;
  createdAt: Timestamp;
}

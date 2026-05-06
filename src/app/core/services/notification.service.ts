import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { NotificationDoc } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private firestore = inject(Firestore);

  watchNotifications(deptId: string, uid: string): Observable<NotificationDoc[]> {
    const ref = collection(
      this.firestore,
      `departments/${deptId}/users/${uid}/notifications`
    );
    const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
    return collectionData(q, { idField: 'id' }) as Observable<NotificationDoc[]>;
  }

  markAsRead(deptId: string, uid: string, notifId: string): Promise<void> {
    const ref = doc(
      this.firestore,
      `departments/${deptId}/users/${uid}/notifications/${notifId}`
    );
    return updateDoc(ref, { read: true });
  }

  markAllAsRead(deptId: string, uid: string, notifIds: string[]): Promise<void> {
    if (notifIds.length === 0) return Promise.resolve();
    const batch = writeBatch(this.firestore);
    for (const notifId of notifIds) {
      const ref = doc(
        this.firestore,
        `departments/${deptId}/users/${uid}/notifications/${notifId}`
      );
      batch.update(ref, { read: true });
    }
    return batch.commit();
  }
}

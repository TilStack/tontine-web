import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  docData,
  setDoc,
  updateDoc,
  collection,
  collectionData,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchProfile(deptId: string, uid: string): Observable<UserProfile | undefined> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    return docData(ref) as Observable<UserProfile | undefined>;
  }

  watchAllMembers(deptId: string): Observable<UserProfile[]> {
    const ref = collection(this.firestore, `departments/${deptId}/users`);
    return collectionData(ref, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  async createProfile(
    deptId: string,
    uid: string,
    data: Pick<UserProfile, 'displayName' | 'email' | 'role' | 'rang' | 'mustResetPassword'>
  ): Promise<void> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    await setDoc(ref, {
      ...data,
      hasBenefited: false,
      joinedAt: serverTimestamp(),
    });
  }

  async setMustResetPassword(deptId: string, uid: string, value: boolean): Promise<void> {
    const ref = doc(this.firestore, `departments/${deptId}/users/${uid}`);
    await updateDoc(ref, { mustResetPassword: value });
  }

  sendInvitation(payload: { deptId: string; email: string; role: UserRole }): Promise<void> {
    const fn = httpsCallable(this.functions, 'sendInvitation');
    return fn(payload).then(() => undefined);
  }

  updateUserRole(payload: { deptId: string; userId: string; newRole: UserRole }): Promise<void> {
    const fn = httpsCallable(this.functions, 'updateUserRole');
    return fn(payload).then(() => undefined);
  }
}

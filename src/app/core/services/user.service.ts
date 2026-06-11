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
import { Observable, firstValueFrom } from 'rxjs';
import { UserProfile, UserRole } from '../models/user.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private api = inject(ApiService);

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

  sendInvitation(payload: { deptId: string; email: string; role: UserRole }): Promise<{ token: string }> {
    return firstValueFrom(this.api.post<{ token: string }>('/invitation/send', payload));
  }

  updateUserRole(payload: { deptId: string; userId: string; newRole: UserRole }): Promise<void> {
    return firstValueFrom(this.api.post('/member/update-role', payload));
  }

  createMember(payload: {
    email: string;
    displayName: string;
    role: 'bureau' | 'membre';
    password: string;
  }): Promise<{ uid: string; displayName: string; email: string }> {
    return firstValueFrom(this.api.post<{ uid: string; displayName: string; email: string }>('/member/create', payload));
  }
}

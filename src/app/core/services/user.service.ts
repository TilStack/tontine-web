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
import { Auth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { UserProfile, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private auth = inject(Auth);

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

  private async post(path: string, body: unknown): Promise<void> {
    const token = await this.auth.currentUser?.getIdToken();
    return firstValueFrom(
      this.http.post<void>(`${environment.apiUrl}${path}`, body, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
    );
  }

  sendInvitation(payload: { deptId: string; email: string; role: UserRole }): Promise<void> {
    return this.post('/invitation/send', payload);
  }

  updateUserRole(payload: { deptId: string; userId: string; newRole: UserRole }): Promise<void> {
    return this.post('/member/update-role', payload);
  }
}

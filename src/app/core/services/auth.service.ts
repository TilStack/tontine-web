import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { UserClaims } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  readonly user$: Observable<User | null> = authState(this.auth);

  login(email: string, password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, email, password).then(() => undefined);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  sendPasswordReset(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async getClaims(): Promise<UserClaims | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    const result = await user.getIdTokenResult();
    return result.claims as UserClaims;
  }

  async forceTokenRefresh(): Promise<void> {
    await this.auth.currentUser?.getIdToken(true);
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }
}

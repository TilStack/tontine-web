import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, map, catchError } from 'rxjs';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import {
  Firestore, doc, docData,
} from '@angular/fire/firestore';

interface DeptSettings {
  name?: string;
  adminId?: string;
  status?: string;
}

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [
    MatCard, MatCardContent, MatCardHeader, MatCardTitle,
    MatFormField, MatLabel,
    MatInput,
    MatButton,
    MatProgressSpinner,
  ],
  template: `
    <div style="padding:24px;max-width:600px;margin:0 auto">
      <h2 style="margin:0 0 24px">Paramètres</h2>

      @if (!data()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else if (!isAdmin()) {
        <mat-card>
          <mat-card-content style="padding:24px;color:#666">
            Seul l'administrateur peut accéder aux paramètres.
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-header>
            <mat-card-title>Informations du département</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:16px;display:flex;flex-direction:column;gap:16px">
            <mat-form-field>
              <mat-label>Nom du département</mat-label>
              <input matInput [value]="data()!.dept?.name ?? ''" readonly>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Statut</mat-label>
              <input matInput [value]="data()!.dept?.status ?? ''" readonly>
            </mat-form-field>
            <p style="color:#888;font-size:13px;margin:0">
              Pour modifier les paramètres du département, contactez le super administrateur.
            </p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class ParametresComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private firestore = inject(Firestore);

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const uid = this.auth.currentUser!.uid;
      const deptRef = doc(this.firestore, `departments/${claims.deptId}`);
      return (docData(deptRef) as any).pipe(
        switchMap((dept: DeptSettings) =>
          this.userService.watchProfile(claims.deptId, uid).pipe(
            map((profile) => ({ dept, profile }))
          )
        ),
        catchError(() => of(null))
      );
    }),
    catchError(() => of(null))
  );

  data = toSignal(this.data$, { initialValue: null });
  isAdmin = computed(() => this.data()?.profile?.role === 'admin');
}

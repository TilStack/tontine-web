import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { InviteDialogComponent } from '../membres/invite-dialog/invite-dialog.component';

interface InvitationItem {
  token: string;
  email: string;
  role: string;
  used: boolean;
  expiresAt: { toDate(): Date };
  createdAt: { toDate(): Date };
}

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatButton, MatIcon,
    MatProgressSpinner,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    DatePipe,
  ],
  template: `
    <div style="padding:24px;max-width:900px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <h2 style="margin:0">Invitations</h2>
        @if (isAdmin()) {
          <button mat-flat-button color="primary" (click)="openInviteDialog()">
            <mat-icon>send</mat-icon>
            Nouvelle invitation
          </button>
        }
      </div>

      @if (!data()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else if (data()!.invitations.length === 0) {
        <mat-card>
          <mat-card-content style="text-align:center;padding:48px;color:#666">
            Aucune invitation envoyée.
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="data()!.invitations" style="width:100%">
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let inv">{{ inv.email }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Rôle</th>
                <td mat-cell *matCellDef="let inv" style="text-transform:capitalize">{{ inv.role }}</td>
              </ng-container>
              <ng-container matColumnDef="statut">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let inv">
                  @if (inv.used) {
                    <span style="color:green">Acceptée</span>
                  } @else if (inv.expiresAt.toDate() < now) {
                    <span style="color:red">Expirée</span>
                  } @else {
                    <span style="color:#f59e0b">En attente</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="expiresAt">
                <th mat-header-cell *matHeaderCellDef>Expire le</th>
                <td mat-cell *matCellDef="let inv">{{ inv.expiresAt.toDate() | date:'dd/MM/yyyy' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class InvitationsComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private firestore = inject(Firestore);
  private dialog = inject(MatDialog);

  displayedColumns = ['email', 'role', 'statut', 'expiresAt'];
  now = new Date();

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const uid = this.auth.currentUser!.uid;
      const invRef = collection(this.firestore, `departments/${claims.deptId}/invitations`);
      return combineLatest([
        this.userService.watchProfile(claims.deptId, uid),
        collectionData(invRef, { idField: 'token' }) as any,
      ]).pipe(map(([profile, invitations]: [any, InvitationItem[]]) => ({
        deptId: claims.deptId,
        profile,
        invitations,
      })));
    })
  );

  data = toSignal(this.data$);
  isAdmin = computed(() => this.data()?.profile?.role === 'admin');

  openInviteDialog(): void {
    const deptId = this.data()?.deptId;
    if (!deptId) return;
    this.dialog.open(InviteDialogComponent, {
      data: { deptId },
      width: '420px',
    });
  }
}

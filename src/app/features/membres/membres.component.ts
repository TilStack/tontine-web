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
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { InviteDialogComponent } from './invite-dialog/invite-dialog.component';

@Component({
  selector: 'app-membres',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatButton, MatIcon,
    MatProgressSpinner,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
  ],
  template: `
    <div style="padding:24px;max-width:900px;margin:0 auto">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <h2 style="margin:0">Membres</h2>
        @if (isAdmin()) {
          <button mat-flat-button color="primary" (click)="openInviteDialog()">
            <mat-icon>person_add</mat-icon>
            Inviter un membre
          </button>
        }
      </div>

      @if (!data()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else if (data()!.members.length === 0) {
        <mat-card>
          <mat-card-content style="text-align:center;padding:48px;color:#666">
            Aucun membre dans ce département.
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="data()!.members" style="width:100%">
              <ng-container matColumnDef="displayName">
                <th mat-header-cell *matHeaderCellDef>Nom</th>
                <td mat-cell *matCellDef="let m">{{ m.displayName }}</td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let m">{{ m.email }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Rôle</th>
                <td mat-cell *matCellDef="let m" style="text-transform:capitalize">{{ m.role }}</td>
              </ng-container>
              <ng-container matColumnDef="rang">
                <th mat-header-cell *matHeaderCellDef>Rang</th>
                <td mat-cell *matCellDef="let m">{{ m.rang }}</td>
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
export class MembresComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);

  displayedColumns = ['displayName', 'email', 'role', 'rang'];

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.userService.watchProfile(claims.deptId, uid),
        this.userService.watchAllMembers(claims.deptId),
      ]).pipe(map(([profile, members]) => ({
        deptId: claims.deptId,
        profile,
        members,
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

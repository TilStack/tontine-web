import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { SuperAdminService } from '../super-admin.service';
import { UserProfile } from '../../../core/models/user.model';
import {
  SaConfirmDialogComponent,
  SaConfirmDialogData,
  SaConfirmDialogResult,
} from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dept-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
    MatCard, MatCardContent, MatCardHeader, MatCardTitle,
    DatePipe, DecimalPipe,
  ],
  templateUrl: './dept-detail.component.html',
  styleUrl: './dept-detail.component.scss',
})
export class DeptDetailComponent {
  private route = inject(ActivatedRoute);
  private saService = inject(SuperAdminService);
  private dialog = inject(MatDialog);

  detail = toSignal(
    this.route.params.pipe(
      switchMap((params) => this.saService.watchDeptDetail(params['deptId']))
    )
  );

  interventionLoading = signal<'close' | 'exclude' | null>(null);
  interventionError = signal<string | null>(null);

  displayedColumns = ['displayName', 'email', 'role', 'rang', 'hasBenefited', 'actions'];

  isCurrentBeneficiary(member: UserProfile): boolean {
    const d = this.detail();
    if (!d) return false;
    return d.currentBeneficiaryUid === member.uid;
  }

  openForceCloseDialog(): void {
    const d = this.detail();
    if (!d?.saison) return;
    const { dept, saison } = d;

    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: 'Clôturer la saison',
            message: `Clôturer la saison du département « ${dept.name} » de force. Action irréversible.`,
            requiresComment: true,
            commentLabel: 'Raison de la clôture (obligatoire)',
            confirmLabel: 'Clôturer',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.interventionLoading.set('close');
        this.interventionError.set(null);
        try {
          await this.saService.forceCloseSaison(dept.id, saison.id, result.comment);
        } catch (err: any) {
          this.interventionError.set(err?.message ?? 'Erreur lors de la clôture.');
        } finally {
          this.interventionLoading.set(null);
        }
      });
  }

  openExcludeDialog(member: UserProfile): void {
    const d = this.detail();
    if (!d) return;
    const deptId = d.dept.id;

    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: `Exclure ${member.displayName}`,
            message: `Exclure ce membre du département. Action irréversible.`,
            requiresComment: true,
            commentLabel: "Raison de l'exclusion (obligatoire)",
            confirmLabel: 'Exclure',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.interventionLoading.set('exclude');
        this.interventionError.set(null);
        try {
          await this.saService.excludeMember(deptId, member.uid, result.comment);
        } catch (err: any) {
          this.interventionError.set(err?.message ?? "Erreur lors de l'exclusion.");
        } finally {
          this.interventionLoading.set(null);
        }
      });
  }
}

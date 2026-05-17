import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SuperAdminService } from '../super-admin.service';
import {
  SaConfirmDialogComponent,
  SaConfirmDialogData,
  SaConfirmDialogResult,
} from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dept-requests',
  standalone: true,
  imports: [
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
  ],
  templateUrl: './dept-requests.component.html',
  styleUrl: './dept-requests.component.scss',
})
export class DeptRequestsComponent {
  private saService = inject(SuperAdminService);
  private dialog = inject(MatDialog);

  requests = toSignal(this.saService.watchPendingRequests());
  loadingId = signal<string | null>(null);
  error = signal<string | null>(null);

  displayedColumns = ['deptName', 'requesterName', 'requesterEmail', 'message', 'actions'];

  async approve(requestId: string): Promise<void> {
    this.loadingId.set(requestId);
    this.error.set(null);
    try {
      await this.saService.approveRequest(requestId);
    } catch (err: any) {
      this.error.set(err?.message ?? "Erreur lors de l'approbation.");
    } finally {
      this.loadingId.set(null);
    }
  }

  openRejectDialog(requestId: string): void {
    this.dialog
      .open<SaConfirmDialogComponent, SaConfirmDialogData, SaConfirmDialogResult>(
        SaConfirmDialogComponent,
        {
          data: {
            title: 'Rejeter la demande',
            message: 'Cette action est irréversible. Indiquez la raison du rejet.',
            requiresComment: true,
            commentLabel: 'Raison du rejet',
            confirmLabel: 'Rejeter',
            dangerMode: true,
          },
          width: '480px',
        }
      )
      .afterClosed()
      .subscribe(async (result) => {
        if (!result?.confirmed) return;
        this.loadingId.set(requestId);
        this.error.set(null);
        try {
          await this.saService.rejectRequest(requestId, result.comment);
        } catch (err: any) {
          this.error.set(err?.message ?? 'Erreur lors du rejet.');
        } finally {
          this.loadingId.set(null);
        }
      });
  }
}

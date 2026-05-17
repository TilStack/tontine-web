import { Component, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface SaConfirmDialogData {
  title: string;
  message: string;
  requiresComment: boolean;
  commentLabel?: string;
  confirmLabel?: string;
  dangerMode?: boolean;
}

export interface SaConfirmDialogResult {
  confirmed: true;
  comment: string;
}

@Component({
  selector: 'app-sa-confirm-dialog',
  standalone: true,
  imports: [
    MatDialogTitle, MatDialogContent, MatDialogActions,
    MatButton, MatFormField, MatLabel, MatInput, FormsModule,
  ],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class SaConfirmDialogComponent {
  data = inject<SaConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SaConfirmDialogComponent>);

  comment = signal('');

  get confirmDisabled(): boolean {
    return this.data.requiresComment && this.comment().trim() === '';
  }

  confirm(): void {
    this.dialogRef.close({ confirmed: true, comment: this.comment() } satisfies SaConfirmDialogResult);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }
}

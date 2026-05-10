import { Component, inject, Inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
  MatDialogRef, MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { UserService } from '../../../core/services/user.service';
import { UserRole } from '../../../core/models/user.model';

export interface InviteDialogData {
  deptId: string;
}

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatFormField, MatLabel, MatError,
    MatInput,
    MatSelect, MatOption,
    MatButton,
  ],
  template: `
    <h2 mat-dialog-title>Inviter un membre</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;min-width:320px;padding-top:8px">
        <mat-form-field>
          <mat-label>Adresse e-mail</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="off">
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>L'e-mail est requis</mat-error>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Format d'e-mail invalide</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Rôle</mat-label>
          <mat-select formControlName="role">
            <mat-option value="membre">Membre</mat-option>
            <mat-option value="bureau">Bureau</mat-option>
          </mat-select>
          @if (form.get('role')?.hasError('required') && form.get('role')?.touched) {
            <mat-error>Choisissez un rôle</mat-error>
          }
        </mat-form-field>
        @if (error()) {
          <p style="color:red;margin:0">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary"
        [disabled]="form.invalid || loading()"
        (click)="submit()">
        {{ loading() ? 'Envoi…' : 'Envoyer l\'invitation' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class InviteDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<InviteDialogComponent>);

  readonly deptId: string;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: [null as UserRole | null, Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) data: InviteDialogData) {
    this.deptId = data.deptId;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.userService.sendInvitation({
        deptId: this.deptId,
        email: this.form.value.email!,
        role: this.form.value.role!,
      });
      this.dialogRef.close(true);
    } catch {
      this.error.set("Erreur lors de l'envoi de l'invitation.");
    } finally {
      this.loading.set(false);
    }
  }
}

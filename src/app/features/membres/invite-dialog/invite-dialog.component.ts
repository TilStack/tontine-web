import { Component, inject, Inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
  MatDialogRef, MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    MatButton, MatIconButton,
    MatIcon,
  ],
  template: `
    <h2 mat-dialog-title>Inviter un membre</h2>
    <mat-dialog-content>
      @if (!invitationLink()) {
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
      } @else {
        <div style="display:flex;flex-direction:column;gap:12px;min-width:320px;padding-top:8px">
          <p style="margin:0;color:green;font-weight:500">Invitation créée !</p>
          <p style="margin:0;font-size:0.85rem;color:#666">
            Partagez ce lien avec <strong>{{ form.value.email }}</strong> :
          </p>
          <div style="display:flex;align-items:center;gap:8px;background:#f5f5f5;border-radius:4px;padding:8px 12px">
            <span style="flex:1;font-size:0.75rem;word-break:break-all;color:#333">{{ invitationLink() }}</span>
            <button mat-icon-button (click)="copyLink()" aria-label="Copier le lien">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (!invitationLink()) {
        <button mat-stroked-button mat-dialog-close>Annuler</button>
        <button mat-flat-button color="primary"
          [disabled]="form.invalid || loading()"
          (click)="submit()">
          {{ loading() ? 'Envoi…' : "Envoyer l'invitation" }}
        </button>
      } @else {
        <button mat-flat-button mat-dialog-close color="primary">Fermer</button>
      }
    </mat-dialog-actions>
  `,
})
export class InviteDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<InviteDialogComponent>);
  private snackBar = inject(MatSnackBar);

  readonly deptId: string;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: [null as UserRole | null, Validators.required],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  invitationLink = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) data: InviteDialogData) {
    this.deptId = data.deptId;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { token } = await this.userService.sendInvitation({
        deptId: this.deptId,
        email: this.form.value.email!,
        role: this.form.value.role!,
      });
      const baseUrl = window.location.origin;
      this.invitationLink.set(
        `${baseUrl}/auth/accept-invitation?dept=${this.deptId}&token=${token}`
      );
    } catch {
      this.error.set("Erreur lors de l'envoi de l'invitation.");
    } finally {
      this.loading.set(false);
    }
  }

  copyLink(): void {
    const link = this.invitationLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.snackBar.open('Lien copié !', undefined, { duration: 2000 });
    });
  }
}

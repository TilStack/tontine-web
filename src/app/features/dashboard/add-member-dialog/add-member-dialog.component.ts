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
import { Clipboard } from '@angular/cdk/clipboard';
import { UserService } from '../../../core/services/user.service';
import { UserRole } from '../../../core/models/user.model';

export interface AddMemberDialogData {
  deptId: string;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Component({
  selector: 'app-add-member-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatFormField, MatLabel, MatError,
    MatInput, MatSelect, MatOption,
    MatButton, MatIconButton, MatIcon,
  ],
  templateUrl: './add-member-dialog.component.html',
  styleUrl: './add-member-dialog.component.scss',
})
export class AddMemberDialogComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private dialogRef = inject(MatDialogRef<AddMemberDialogComponent>);
  private clipboard = inject(Clipboard);

  password = signal(generatePassword());
  showPassword = signal(false);
  copied = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: [null as UserRole | null, Validators.required],
  });

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: AddMemberDialogData) {}

  regenerate(): void {
    this.password.set(generatePassword());
    this.copied.set(false);
  }

  copyPassword(): void {
    this.clipboard.copy(this.password());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.userService.createMember({
        email: this.form.value.email!,
        displayName: this.form.value.displayName!,
        role: this.form.value.role! as 'bureau' | 'membre',
        password: this.password(),
      });
      this.dialogRef.close(true);
    } catch {
      this.error.set('Erreur lors de la création du membre.');
    } finally {
      this.loading.set(false);
    }
  }
}

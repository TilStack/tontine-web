import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Auth, updatePassword } from '@angular/fire/auth';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  loading = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid || !this.auth.currentUser) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await updatePassword(
        this.auth.currentUser,
        this.form.value.password as string,
      );

      const claims = await this.authService.getClaims();
      if (claims?.deptId) {
        await this.userService.setMustResetPassword(
          claims.deptId,
          this.auth.currentUser.uid,
          false,
        );
      }

      await this.router.navigate(['/app']);
    } catch {
      this.error.set(
        'Impossible de changer le mot de passe. Reconnectez-vous et réessayez.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}

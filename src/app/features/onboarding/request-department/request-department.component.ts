import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthLayoutComponent } from '../../auth/auth-layout/auth-layout.component';
import { ApiService } from '../../../core/services/api.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-request-department',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatIcon,
    MatIconButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './request-department.component.html',
  styleUrl: './request-department.component.scss',
})
export class RequestDepartmentComponent {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group(
    {
      requesterName: ['', Validators.required],
      requesterEmail: ['', [Validators.required, Validators.email]],
      deptName: ['', Validators.required],
      message: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  showPassword = signal(false);
  showConfirm = signal(false);
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(
        this.api.postPublic('/department/request', {
          requesterName: this.form.value.requesterName as string,
          requesterEmail: this.form.value.requesterEmail as string,
          deptName: this.form.value.deptName as string,
          description: this.form.value.message as string,
          adminPassword: this.form.value.password as string,
        }),
      );
      this.submitted.set(true);
    } catch (err) {
      const status = err instanceof HttpErrorResponse ? ` (${err.status})` : '';
      this.error.set(`Erreur lors de l'envoi. Réessayez.${status}`);
      console.error('department/request error:', err);
    } finally {
      this.loading.set(false);
    }
  }
}

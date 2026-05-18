import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  resetLoading = signal(false);
  resetSent = signal(false);
  resetError = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.login(
        this.form.value.email as string,
        this.form.value.password as string,
      );
      await this.router.navigate(['/app']);
    } catch {
      this.error.set('Email ou mot de passe incorrect.');
    } finally {
      this.loading.set(false);
    }
  }

  async forgotPassword(): Promise<void> {
    const email = (this.form.value.email as string)?.trim();
    if (!email) {
      this.resetError.set('Entrez votre email ci-dessus avant de continuer.');
      return;
    }
    this.resetLoading.set(true);
    this.resetError.set(null);
    this.resetSent.set(false);
    try {
      await this.auth.sendPasswordReset(email);
      this.resetSent.set(true);
    } catch {
      this.resetError.set("Impossible d'envoyer l'email. Vérifiez l'adresse.");
    } finally {
      this.resetLoading.set(false);
    }
  }
}

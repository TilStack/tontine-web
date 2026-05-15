import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatButton,
    MatProgressSpinner,
    AuthLayoutComponent,
  ],
  templateUrl: './accept-invitation.component.html',
  styleUrl: './accept-invitation.component.scss',
})
export class AcceptInvitationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private functions = inject(Functions);
  private fb = inject(FormBuilder);

  token = signal<string | null>(null);
  deptId = signal<string | null>(null);
  invitationEmail = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  tokenValid = signal<boolean | null>(null);

  form: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const dept = params.get('dept');
    const token = params.get('token');

    if (!dept || !token) {
      this.tokenValid.set(false);
      return;
    }

    this.deptId.set(dept);
    this.token.set(token);

    try {
      const validateFn = httpsCallable<
        { deptId: string; token: string },
        { email: string; deptName: string }
      >(this.functions, 'validateInvitation');

      const result = await validateFn({ deptId: dept, token });
      this.invitationEmail.set(result.data.email);
      this.tokenValid.set(true);
    } catch {
      this.tokenValid.set(false);
    }
  }

  async submit(): Promise<void> {
    if (
      this.form.invalid ||
      !this.invitationEmail() ||
      !this.deptId() ||
      !this.token()
    )
      return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const { user } = await createUserWithEmailAndPassword(
        this.auth,
        this.invitationEmail()!,
        this.form.value.password as string,
      );
      await updateProfile(user, {
        displayName: this.form.value.displayName as string,
      });

      const acceptFn = httpsCallable<{ deptId: string; token: string }, void>(
        this.functions,
        'acceptInvitation',
      );
      await acceptFn({ deptId: this.deptId()!, token: this.token()! });

      await user.getIdToken(true);
      await this.router.navigate(['/app']);
    } catch {
      this.error.set(
        'Une erreur est survenue. Vérifiez que le lien est valide.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}

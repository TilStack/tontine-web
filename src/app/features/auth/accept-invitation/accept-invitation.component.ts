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
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  Auth,
  createUserWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';
import { environment } from '../../../../environments/environment';

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
  private http = inject(HttpClient);
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

  slowApiWarning = signal(false);

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

    // Render.com free tier cold start peut prendre 30s — avertir après 5s
    const slowTimer = setTimeout(() => this.slowApiWarning.set(true), 5000);

    try {
      const result = await firstValueFrom(
        this.http.post<{ email: string; deptName: string }>(
          `${environment.apiUrl}/invitation/validate`,
          { deptId: dept, token }
        )
      );
      this.invitationEmail.set(result.email);
      this.tokenValid.set(true);
    } catch (err) {
      this.tokenValid.set(false);
    } finally {
      clearTimeout(slowTimer);
      this.slowApiWarning.set(false);
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

    let firebaseUserCreated = false;
    let currentUser: import('@angular/fire/auth').User | null = null;

    try {
      const { user } = await createUserWithEmailAndPassword(
        this.auth,
        this.invitationEmail()!,
        this.form.value.password as string,
      );
      firebaseUserCreated = true;
      currentUser = user;

      await updateProfile(user, {
        displayName: this.form.value.displayName as string,
      });

      const idToken = await user.getIdToken();
      await firstValueFrom(
        this.http.post<void>(
          `${environment.apiUrl}/invitation/accept`,
          { deptId: this.deptId()!, token: this.token()! },
          { headers: { Authorization: `Bearer ${idToken}` } }
        )
      );

      // Attendre que Firebase propage les custom claims avant le refresh
      await new Promise((resolve) => setTimeout(resolve, 500));
      await user.getIdToken(true);
      await this.router.navigate(['/app']);
    } catch (err) {
      // Si le compte Firebase est créé mais que l'API a échoué → supprimer le compte
      if (firebaseUserCreated && currentUser) {
        try { await currentUser.delete(); } catch { /* ignore */ }
      }

      if (err instanceof HttpErrorResponse) {
        const code = (err.error as { code?: string })?.code;
        if (code === 'already-exists') {
          this.error.set("Cette invitation a déjà été utilisée.");
        } else if (code === 'deadline-exceeded') {
          this.error.set("Ce lien d'invitation a expiré.");
        } else if (code === 'permission-denied') {
          this.error.set("Votre email ne correspond pas à cette invitation.");
        } else {
          this.error.set(`Erreur serveur (${err.status}). Réessayez.`);
        }
      } else if ((err as { code?: string })?.code === 'auth/email-already-in-use') {
        this.error.set("Un compte existe déjà avec cet email. Connectez-vous.");
      } else {
        this.error.set("Une erreur est survenue. Vérifiez que le lien est valide.");
      }
    } finally {
      this.loading.set(false);
    }
  }
}

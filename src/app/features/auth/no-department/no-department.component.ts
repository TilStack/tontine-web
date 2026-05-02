import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-no-department',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <div style="padding: 2rem; text-align: center;">
      <h2>Compte sans département</h2>
      <p>
        Votre compte n'est associé à aucun département actif.<br />
        Attendez l'invitation de votre administrateur ou contactez le support.
      </p>
      <button mat-stroked-button (click)="logout()">Se déconnecter</button>
    </div>
  `,
})
export class NoDepartmentComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}

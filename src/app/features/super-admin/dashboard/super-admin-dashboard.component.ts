import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatListModule, MatButtonModule],
  template: `
    <mat-sidenav-container style="height: 100vh">
      <mat-sidenav mode="side" opened style="width: 200px; padding: 16px">
        <h3>Super Admin</h3>
        <mat-nav-list>
          <a mat-list-item routerLink="requests" routerLinkActive="active-link">
            Demandes de département
          </a>
        </mat-nav-list>
        <button mat-stroked-button (click)="logout()" style="margin-top: auto">
          Déconnexion
        </button>
      </mat-sidenav>
      <mat-sidenav-content style="padding: 24px">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class SuperAdminDashboardComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}

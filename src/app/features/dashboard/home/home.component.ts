import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { MembreDashboardComponent } from '../membre/membre-dashboard.component';
import { BureauDashboardComponent } from '../bureau/bureau-dashboard.component';
import { AdminDashboardComponent } from '../admin/admin-dashboard.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatProgressSpinner,
    MembreDashboardComponent,
    BureauDashboardComponent,
    AdminDashboardComponent,
  ],
  template: `
    @if (!profile()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else if (profile()!.role === 'admin') {
      <app-admin-dashboard></app-admin-dashboard>
    } @else if (profile()!.role === 'bureau') {
      <app-bureau-dashboard></app-bureau-dashboard>
    } @else {
      <app-membre-dashboard></app-membre-dashboard>
    }
  `,
})
export class HomeComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);

  private profile$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(undefined);
      return this.userService.watchProfile(claims.deptId, this.auth.currentUser!.uid);
    })
  );

  profile = toSignal(this.profile$);
}

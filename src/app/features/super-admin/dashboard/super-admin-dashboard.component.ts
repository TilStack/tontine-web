import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatNavList, MatListItem } from '@angular/material/list';
import { MatButton } from '@angular/material/button';
import { AuthService } from '../../../core/services/auth.service';
import { SuperAdminService } from '../super-admin.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenav, MatSidenavContainer, MatSidenavContent,
    MatNavList, MatListItem,
    MatButton,
  ],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.scss',
})
export class SuperAdminDashboardComponent {
  private auth = inject(AuthService);
  private saService = inject(SuperAdminService);
  private router = inject(Router);

  private departments = toSignal(this.saService.watchDepartments(), { initialValue: [] });
  private requests = toSignal(this.saService.watchPendingRequests(), { initialValue: [] });

  deptCount = computed(() => this.departments().length);
  pendingCount = computed(() => this.requests().length);

  async logout(): Promise<void> {
    console.log('logout called');
    await this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}

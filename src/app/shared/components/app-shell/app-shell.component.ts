import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserProfile, UserRole } from '../../../core/models/user.model';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', route: '/app',             icon: 'dashboard',       roles: ['admin', 'bureau', 'membre'] },
  { label: 'Cotisations',     route: '/app/cotisations', icon: 'payments',        roles: ['admin', 'bureau', 'membre'] },
  { label: 'Membres',         route: '/app/membres',     icon: 'group',           roles: ['admin', 'bureau', 'membre'] },
  { label: 'Caisse',          route: '/app/caisse',      icon: 'account_balance', roles: ['admin', 'bureau'] },
  { label: 'Cycles',          route: '/app/cycles',      icon: 'loop',            roles: ['admin'] },
  { label: 'Invitations',     route: '/app/invitations', icon: 'send',            roles: ['admin'] },
  { label: 'Paramètres',      route: '/app/parametres',  icon: 'settings',        roles: ['admin'] },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIcon,
    NotificationBellComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  profile = signal<UserProfile | null>(null);
  deptId = signal<string | null>(null);
  uid = signal<string | null>(null);

  visibleNavItems = computed(() => {
    const role = this.profile()?.role;
    if (!role) return [];
    return NAV_ITEMS.filter((item) => item.roles.includes(role));
  });

  async ngOnInit(): Promise<void> {
    const claims = await this.authService.getClaims();
    if (!claims?.deptId) return;
    this.deptId.set(claims.deptId);

    const currentUid = this.authService.currentUser?.uid;
    if (!currentUid) return;
    this.uid.set(currentUid);

    this.userService.watchProfile(claims.deptId, currentUid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        if (p) this.profile.set(p);
      });
  }

  async logout(): Promise<void> {
    console.log('logout called');
    await this.authService.logout();
    await this.router.navigate(['/auth/login']);
  }
}

import { Routes } from '@angular/router';
import { adminRoleGuard } from '../../core/guards/admin-role.guard';

export const CYCLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cycle-active/cycle-active.component').then((m) => m.CycleActiveComponent),
  },
  {
    path: 'setup',
    canActivate: [adminRoleGuard],
    loadComponent: () =>
      import('./saison-setup/saison-setup.component').then((m) => m.SaisonSetupComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./cycle-history/cycle-history.component').then((m) => m.CycleHistoryComponent),
  },
];

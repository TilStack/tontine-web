import { Routes } from '@angular/router';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/super-admin-dashboard.component').then(
        (m) => m.SuperAdminDashboardComponent
      ),
    children: [
      {
        path: 'requests',
        loadComponent: () =>
          import('./requests/dept-requests.component').then(
            (m) => m.DeptRequestsComponent
          ),
      },
      { path: '', redirectTo: 'requests', pathMatch: 'full' },
    ],
  },
];

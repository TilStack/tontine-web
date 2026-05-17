import { Routes } from '@angular/router';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/super-admin-dashboard.component').then(
        (m) => m.SuperAdminDashboardComponent
      ),
    children: [
      { path: '', redirectTo: 'departments', pathMatch: 'full' },
      {
        path: 'departments',
        loadComponent: () =>
          import('./dept-list/dept-list.component').then((m) => m.DeptListComponent),
      },
      {
        path: 'departments/:deptId',
        loadComponent: () =>
          import('./dept-detail/dept-detail.component').then((m) => m.DeptDetailComponent),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./requests/dept-requests.component').then((m) => m.DeptRequestsComponent),
      },
    ],
  },
];

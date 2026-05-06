import { Routes } from '@angular/router';

export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'request',
    loadComponent: () =>
      import('./request-department/request-department.component').then(
        (m) => m.RequestDepartmentComponent
      ),
  },
  { path: '', redirectTo: 'request', pathMatch: 'full' },
];

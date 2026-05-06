import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./accept-invitation/accept-invitation.component').then(
        (m) => m.AcceptInvitationComponent
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent
      ),
  },
  {
    path: 'no-department',
    loadComponent: () =>
      import('./no-department/no-department.component').then(
        (m) => m.NoDepartmentComponent
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];

import { Routes } from '@angular/router';

export const INVITATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./invitations.component').then((m) => m.InvitationsComponent),
  },
];

import { Routes } from '@angular/router';

export const MEMBRES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./membres.component').then((m) => m.MembresComponent),
  },
];

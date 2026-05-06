import { Routes } from '@angular/router';

export const CAISSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./caisse/caisse.component').then((m) => m.CaisseComponent),
  },
];

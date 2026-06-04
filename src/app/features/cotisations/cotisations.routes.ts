import { Routes } from '@angular/router';

export const COTISATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cotisations.component').then((m) => m.CotisationsComponent),
  },
];

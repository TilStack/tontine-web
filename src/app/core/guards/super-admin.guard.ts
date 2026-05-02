import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const claims = await auth.getClaims();
  if (claims?.role !== 'super_admin') {
    return router.createUrlTree(['/app']);
  }
  return true;
};

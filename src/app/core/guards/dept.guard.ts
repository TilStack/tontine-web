import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const deptGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const claims = await auth.getClaims();
  if (!claims?.deptId) {
    return router.createUrlTree(['/auth/no-department']);
  }
  return true;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const mustResetPasswordGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  const uid = auth.currentUser?.uid;
  const claims = await auth.getClaims();
  if (!uid || !claims?.deptId) return true;

  const profile = await firstValueFrom(userService.watchProfile(claims.deptId, uid));
  if (profile?.mustResetPassword) {
    return router.createUrlTree(['/auth/reset-password']);
  }
  return true;
};

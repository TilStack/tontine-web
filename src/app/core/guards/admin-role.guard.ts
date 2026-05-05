import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

export const adminRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return firstValueFrom(
    auth.user$.pipe(
      take(1),
      switchMap((user) => {
        if (!user) return of(router.createUrlTree(['/auth/login']));
        return from(auth.getClaims()).pipe(
          switchMap((claims) => {
            if (!claims?.deptId) return of(router.createUrlTree(['/auth/no-department']));
            return userService.watchProfile(claims.deptId, user.uid).pipe(
              take(1),
              map((profile) =>
                profile?.role === 'admin' ? true : router.createUrlTree(['/app'])
              )
            );
          })
        );
      })
    )
  );
};

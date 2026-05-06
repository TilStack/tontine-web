import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { mustResetPasswordGuard } from './must-reset-password.guard';
import { of } from 'rxjs';

describe('mustResetPasswordGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/reset-password') } as any;
    authService = {
      currentUser: { uid: 'user-1' } as any,
      getClaims: jest.fn().mockResolvedValue({ deptId: 'dept-1' }),
    } as any;
    userService = { watchProfile: jest.fn() } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: UserService, useValue: userService },
      ],
    });
  });

  it('should redirect to /auth/reset-password when mustResetPassword is true', async () => {
    (userService.watchProfile as jest.Mock).mockReturnValue(
      of({ mustResetPassword: true })
    );
    await TestBed.runInInjectionContext(() => mustResetPasswordGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/reset-password']);
  });

  it('should allow when mustResetPassword is false', async () => {
    (userService.watchProfile as jest.Mock).mockReturnValue(
      of({ mustResetPassword: false })
    );
    const result = await TestBed.runInInjectionContext(
      () => mustResetPasswordGuard({} as any, {} as any)
    );
    expect(result).toBe(true);
  });
});

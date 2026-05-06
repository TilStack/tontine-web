import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { adminRoleGuard } from './admin-role.guard';
import { of } from 'rxjs';

describe('adminRoleGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    router = {
      createUrlTree: jest.fn().mockImplementation((path) => path),
    } as any;
    authService = {
      user$: of({ uid: 'user-1' } as any),
      getClaims: jest.fn(),
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

  it('should allow when role is admin', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: 'dept-1' });
    (userService.watchProfile as jest.Mock).mockReturnValue(of({ role: 'admin' }));
    const result = await TestBed.runInInjectionContext(() => adminRoleGuard({} as any, {} as any));
    expect(result).toBe(true);
  });

  it('should redirect to /app when role is bureau', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: 'dept-1' });
    (userService.watchProfile as jest.Mock).mockReturnValue(of({ role: 'bureau' }));
    await TestBed.runInInjectionContext(() => adminRoleGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('should redirect to /app when role is membre', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: 'dept-1' });
    (userService.watchProfile as jest.Mock).mockReturnValue(of({ role: 'membre' }));
    await TestBed.runInInjectionContext(() => adminRoleGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/app']);
  });

  it('should redirect to /auth/login when not authenticated', async () => {
    authService.user$ = of(null as any);
    (authService.getClaims as jest.Mock).mockResolvedValue(null);
    await TestBed.runInInjectionContext(() => adminRoleGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should redirect to /auth/no-department when no deptId', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: undefined });
    await TestBed.runInInjectionContext(() => adminRoleGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/no-department']);
  });
});

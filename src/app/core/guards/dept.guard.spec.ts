import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { deptGuard } from './dept.guard';

describe('deptGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/no-department') } as any;
    authService = { getClaims: jest.fn() } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('should redirect to /auth/no-department when no deptId claim', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: undefined });
    await TestBed.runInInjectionContext(() => deptGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/no-department']);
  });

  it('should allow when deptId claim is present', async () => {
    (authService.getClaims as jest.Mock).mockResolvedValue({ deptId: 'dept-1' });
    const result = await TestBed.runInInjectionContext(() => deptGuard({} as any, {} as any));
    expect(result).toBe(true);
  });
});

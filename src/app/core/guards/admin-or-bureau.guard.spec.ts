import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { adminOrBureauGuard } from './admin-or-bureau.guard';

describe('adminOrBureauGuard', () => {
  let authMock: { user$: any; getClaims: jest.Mock };
  let userServiceMock: { watchProfile: jest.Mock };
  let routerMock: { createUrlTree: jest.Mock };

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      adminOrBureauGuard({} as any, {} as any)
    );

  const setupRole = (role: string) => {
    authMock.user$ = of({ uid: 'u1' });
    authMock.getClaims.mockResolvedValue({ deptId: 'dept-1' });
    userServiceMock.watchProfile.mockReturnValue(of({ uid: 'u1', role }));
  };

  beforeEach(() => {
    authMock = { user$: of(null), getClaims: jest.fn() };
    userServiceMock = { watchProfile: jest.fn() };
    routerMock = { createUrlTree: jest.fn((path) => ({ path })) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should allow admin', async () => {
    setupRole('admin');
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('should allow bureau', async () => {
    setupRole('bureau');
    const result = await runGuard();
    expect(result).toBe(true);
  });

  it('should redirect membre to /app', async () => {
    setupRole('membre');
    await runGuard();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/app']);
  });
});

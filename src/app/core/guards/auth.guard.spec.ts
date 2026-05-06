import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { of } from 'rxjs';

describe('authGuard', () => {
  let router: jest.Mocked<Router>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    router = { createUrlTree: jest.fn().mockReturnValue('/auth/login') } as any;
    authService = { user$: of(null) } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('should redirect to /auth/login when not authenticated', async () => {
    authService.user$ = of(null);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should allow when authenticated', async () => {
    authService.user$ = of({ uid: 'user-1' } as any);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBe(true);
  });
});

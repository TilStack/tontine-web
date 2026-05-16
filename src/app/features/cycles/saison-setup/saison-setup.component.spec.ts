import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { SaisonSetupComponent } from './saison-setup.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';

describe('SaisonSetupComponent', () => {
  function setup(members: any[]) {
    TestBed.configureTestingModule({
      imports: [SaisonSetupComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { getClaims: () => Promise.resolve({ deptId: 'd1' }) },
        },
        {
          provide: UserService,
          useValue: { watchAllMembers: () => of(members) },
        },
        { provide: SaisonService, useValue: { createSaison: jest.fn().mockResolvedValue(undefined) } },
      ],
    });
    const f: ComponentFixture<SaisonSetupComponent> = TestBed.createComponent(SaisonSetupComponent);
    return f;
  }

  it('shows minimum-members message when department has fewer than 2 members', async () => {
    const f = setup([]);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('au moins 2 membres');
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows form when department has 2 or more members', async () => {
    const f = setup([
      { uid: 'u1', displayName: 'Alice', joinedAt: { seconds: 1 } },
      { uid: 'u2', displayName: 'Bob', joinedAt: { seconds: 2 } },
    ]);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('form')).toBeTruthy();
    expect(f.nativeElement.textContent).not.toContain('au moins 2 membres');
  });

  it('shows .alert-error class on submit error', async () => {
    const errorSaisonSvc = {
      createSaison: jest.fn().mockRejectedValue(new Error('Quota dépassé')),
    };
    TestBed.configureTestingModule({
      imports: [SaisonSetupComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { getClaims: () => Promise.resolve({ deptId: 'd1' }) },
        },
        {
          provide: UserService,
          useValue: {
            watchAllMembers: () => of([
              { uid: 'u1', displayName: 'Alice', joinedAt: { seconds: 1 } },
              { uid: 'u2', displayName: 'Bob', joinedAt: { seconds: 2 } },
            ]),
          },
        },
        { provide: SaisonService, useValue: errorSaisonSvc },
      ],
    });
    const f: ComponentFixture<SaisonSetupComponent> = TestBed.createComponent(SaisonSetupComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    await f.componentInstance.submit();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });
});

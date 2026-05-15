import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MembreDashboardComponent } from './membre-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('MembreDashboardComponent', () => {
  it('shows skeleton (.dashboard-loading) when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [MembreDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<MembreDashboardComponent> = TestBed.createComponent(MembreDashboardComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeNull();
  });

  it('shows grid (.dashboard-grid) when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [MembreDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getClaims: () => Promise.resolve({ deptId: 'd1' }),
            currentUser: { uid: 'u1' },
          },
        },
        {
          provide: UserService,
          useValue: {
            watchAllMembers: () => of([]),
            watchProfile: () => of(null),
          },
        },
        { provide: SaisonService, useValue: { watchActiveSaison: () => of(null) } },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<MembreDashboardComponent> = TestBed.createComponent(MembreDashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeNull();
  });
});

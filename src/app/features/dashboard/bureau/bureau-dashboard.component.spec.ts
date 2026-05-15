import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BureauDashboardComponent } from './bureau-dashboard.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';

describe('BureauDashboardComponent', () => {
  it('shows skeleton when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [BureauDashboardComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
        { provide: CaisseService, useValue: {} },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<BureauDashboardComponent> = TestBed.createComponent(BureauDashboardComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeNull();
  });

  it('shows grid when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [BureauDashboardComponent, NoopAnimationsModule],
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
        {
          provide: CaisseService,
          useValue: { watchCaisse: () => of(undefined), watchTransactions: () => of([]) },
        },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    });
    const f: ComponentFixture<BureauDashboardComponent> = TestBed.createComponent(BureauDashboardComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.dashboard-grid')).toBeTruthy();
  });
});

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CycleActiveComponent } from './cycle-active.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('CycleActiveComponent', () => {
  it('shows skeleton (.cycle-active-loading) when context is pending', () => {
    TestBed.configureTestingModule({
      imports: [CycleActiveComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleActiveComponent> = TestBed.createComponent(CycleActiveComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.cycle-active-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.cycle-active-content')).toBeNull();
  });

  it('shows content (.cycle-active-content) when context has value', async () => {
    TestBed.configureTestingModule({
      imports: [CycleActiveComponent, NoopAnimationsModule],
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
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleActiveComponent> = TestBed.createComponent(CycleActiveComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.cycle-active-content')).toBeTruthy();
    expect(f.nativeElement.querySelector('.cycle-active-loading')).toBeNull();
  });
});

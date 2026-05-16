import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { CycleHistoryComponent } from './cycle-history.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';

describe('CycleHistoryComponent', () => {
  it('shows skeleton (.history-loading) when data is pending', () => {
    TestBed.configureTestingModule({
      imports: [CycleHistoryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getClaims: () => NEVER, currentUser: null } },
        { provide: UserService, useValue: {} },
        { provide: SaisonService, useValue: {} },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleHistoryComponent> = TestBed.createComponent(CycleHistoryComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.history-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.history-content')).toBeNull();
  });

  it('shows content (.history-content) when data resolves', async () => {
    TestBed.configureTestingModule({
      imports: [CycleHistoryComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getClaims: () => Promise.resolve({ deptId: 'd1' }),
            currentUser: { uid: 'u1' },
          },
        },
        { provide: UserService, useValue: { watchAllMembers: () => of([]) } },
        { provide: SaisonService, useValue: { watchActiveSaison: () => of(null) } },
        { provide: CycleService, useValue: {} },
      ],
    });
    const f: ComponentFixture<CycleHistoryComponent> = TestBed.createComponent(CycleHistoryComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.history-content')).toBeTruthy();
    expect(f.nativeElement.querySelector('.history-loading')).toBeNull();
  });
});

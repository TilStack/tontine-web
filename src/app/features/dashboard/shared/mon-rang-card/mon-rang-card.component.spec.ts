import { TestBed } from '@angular/core/testing';
import { MonRangCardComponent } from './mon-rang-card.component';
import { CycleService } from '../../../../core/services/cycle.service';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { UserProfile } from '../../../../core/models/user.model';
import { Cycle } from '../../../../core/models/cycle.model';

const myProfile: UserProfile = {
  uid: 'u1', displayName: 'Alice', email: 'a@b.com',
  role: 'membre', rang: 1, hasBenefited: false,
  joinedAt: { seconds: 0, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const makeCycle = (overrides: Partial<Cycle>): Cycle => ({
  id: 'c1', index: 1, beneficiaryUid: 'u1',
  deadline: { seconds: 9999999, nanoseconds: 0 } as any,
  status: 'open', closedAt: null, closedBy: null,
  totalPaid: 3, montantVerse: 0, montantCaisse: 0,
  confirmedAt: null, confirmedBy: null,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  ...overrides,
});

describe('MonRangCardComponent — ctaState', () => {
  let component: MonRangCardComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MonRangCardComponent],
      providers: [
        CycleService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    component = TestBed.createComponent(MonRangCardComponent).componentInstance;
    component.myProfile = myProfile;
    component.memberOrder = ['u1', 'u2', 'u3'];
    component.saisonId = 's1';
    component.deptId = 'd1';
  });

  it('returns "none" when user is not the beneficiary', () => {
    component.cycle = makeCycle({ beneficiaryUid: 'u2' });
    expect(component.ctaState).toBe('none');
  });

  it('returns "disabled" when cycle is open and user is beneficiary', () => {
    component.cycle = makeCycle({ status: 'open', confirmedAt: null });
    expect(component.ctaState).toBe('disabled');
  });

  it('returns "active" when cycle is closed, user is beneficiary, confirmedAt is null', () => {
    component.cycle = makeCycle({
      status: 'closed',
      confirmedAt: null,
      closedAt: { seconds: 1000, nanoseconds: 0 } as any,
      closedBy: 'admin',
    });
    expect(component.ctaState).toBe('active');
  });

  it('returns "confirmed" when confirmedAt is set', () => {
    component.cycle = makeCycle({
      status: 'closed',
      confirmedAt: { seconds: 2000, nanoseconds: 0 } as any,
      confirmedBy: 'u1',
      closedAt: { seconds: 1000, nanoseconds: 0 } as any,
      closedBy: 'admin',
    });
    expect(component.ctaState).toBe('confirmed');
  });

  it('myRank returns 1-based position in memberOrder', () => {
    component.cycle = makeCycle({});
    expect(component.myRank).toBe(1);
  });
});

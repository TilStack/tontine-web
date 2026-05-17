import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeptDetailComponent } from './dept-detail.component';
import { SuperAdminService, DeptDetail } from '../super-admin.service';
import { UserProfile } from '../../../core/models/user.model';

const mockMember: UserProfile = {
  uid: 'u1',
  displayName: 'Alice',
  email: 'alice@a.com',
  role: 'membre',
  rang: 1,
  hasBenefited: false,
  joinedAt: { seconds: 1000, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const mockBeneficiary: UserProfile = {
  uid: 'u2',
  displayName: 'Bob',
  email: 'bob@b.com',
  role: 'membre',
  rang: 2,
  hasBenefited: false,
  joinedAt: { seconds: 2000, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

const mockDetail: DeptDetail = {
  dept: {
    id: 'd1', name: 'Dept Alpha', adminId: 'u-admin', status: 'active',
    createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
    settings: {},
  },
  saison: {
    id: 's1', status: 'active', mode: 'fixed', montantCotisation: 10000,
    memberOrder: ['u2', 'u1'], totalCycles: 2, currentCycleIndex: 0,
    completedAt: null,
    createdAt: { seconds: 1000, nanoseconds: 0 } as any,
    createdBy: 'u-admin',
  },
  currentBeneficiaryUid: 'u2',
  members: [mockMember, mockBeneficiary],
};

describe('DeptDetailComponent', () => {
  it('shows skeleton when loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { params: NEVER } },
        { provide: SuperAdminService, useValue: { watchDeptDetail: () => NEVER } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(DeptDetailComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-dept-detail-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    let saMock: {
      watchDeptDetail: jest.Mock;
      forceCloseSaison: jest.Mock;
      excludeMember: jest.Mock;
    };
    let dialogMock: { open: jest.Mock };

    beforeEach(async () => {
      saMock = {
        watchDeptDetail: jest.fn().mockReturnValue(of(mockDetail)),
        forceCloseSaison: jest.fn().mockResolvedValue(undefined),
        excludeMember: jest.fn().mockResolvedValue(undefined),
      };
      dialogMock = { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) };

      await TestBed.configureTestingModule({
        imports: [DeptDetailComponent, NoopAnimationsModule],
        providers: [
          { provide: ActivatedRoute, useValue: { params: of({ deptId: 'd1' }) } },
          { provide: SuperAdminService, useValue: saMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('renders dept name', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Dept Alpha');
    });

    it('isCurrentBeneficiary returns true for currentBeneficiaryUid member', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.isCurrentBeneficiary(mockBeneficiary)).toBe(true);
    });

    it('isCurrentBeneficiary returns false for non-beneficiary member', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      expect(f.componentInstance.isCurrentBeneficiary(mockMember)).toBe(false);
    });

    it('openForceCloseDialog() opens SaConfirmDialogComponent', async () => {
      const f = TestBed.createComponent(DeptDetailComponent);
      f.detectChanges();
      await f.whenStable();
      f.componentInstance.openForceCloseDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});

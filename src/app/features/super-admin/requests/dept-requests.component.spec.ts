import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { DeptRequestsComponent } from './dept-requests.component';
import { SuperAdminService } from '../super-admin.service';
import { DepartmentRequest } from '../../../core/models/department-request.model';

const mockRequest: DepartmentRequest = {
  id: 'req-1',
  requesterEmail: 'a@b.com',
  requesterName: 'Alice',
  deptName: 'Dept Alpha',
  message: 'Bonjour',
  status: 'pending',
  createdAt: { seconds: 1000, nanoseconds: 0 } as any,
};

describe('DeptRequestsComponent', () => {
  it('shows skeleton when loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptRequestsComponent, NoopAnimationsModule],
      providers: [
        { provide: SuperAdminService, useValue: { watchPendingRequests: () => NEVER } },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(DeptRequestsComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-requests-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    let saMock: { watchPendingRequests: jest.Mock; approveRequest: jest.Mock; rejectRequest: jest.Mock };
    let dialogMock: { open: jest.Mock };

    beforeEach(async () => {
      saMock = {
        watchPendingRequests: jest.fn().mockReturnValue(of([mockRequest])),
        approveRequest: jest.fn().mockResolvedValue(undefined),
        rejectRequest: jest.fn().mockResolvedValue(undefined),
      };
      dialogMock = { open: jest.fn().mockReturnValue({ afterClosed: () => of(undefined) }) };

      await TestBed.configureTestingModule({
        imports: [DeptRequestsComponent, NoopAnimationsModule],
        providers: [
          { provide: SuperAdminService, useValue: saMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('renders request rows', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      expect(f.nativeElement.textContent).toContain('Dept Alpha');
    });

    it('approve() calls saService.approveRequest with correct id', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      await f.componentInstance.approve('req-1');
      expect(saMock.approveRequest).toHaveBeenCalledWith('req-1');
    });

    it('openRejectDialog() opens SaConfirmDialogComponent', async () => {
      const f = TestBed.createComponent(DeptRequestsComponent);
      f.detectChanges();
      await f.whenStable();
      f.componentInstance.openRejectDialog('req-1');
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DeptListComponent } from './dept-list.component';
import { SuperAdminService } from '../super-admin.service';
import { Department } from '../../../core/models/department.model';

const mockDepts: Department[] = [
  {
    id: 'd1', name: 'Dept A', adminId: 'u1', status: 'active',
    createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
    settings: {},
  },
  {
    id: 'd2', name: 'Dept B', adminId: 'u2', status: 'pending',
    createdAt: { seconds: 2000, nanoseconds: 0, toDate: () => new Date(2000000) } as any,
    settings: {},
  },
  {
    id: 'd3', name: 'Dept C', adminId: 'u3', status: 'active',
    createdAt: { seconds: 3000, nanoseconds: 0, toDate: () => new Date(3000000) } as any,
    settings: {},
  },
];

describe('DeptListComponent', () => {
  it('shows skeleton when data is loading', () => {
    TestBed.configureTestingModule({
      imports: [DeptListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SuperAdminService, useValue: { watchDepartments: () => NEVER } },
      ],
    });
    const f = TestBed.createComponent(DeptListComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.sa-dept-list-loading')).toBeTruthy();
  });

  describe('loaded state', () => {
    async function setup(depts: Department[]) {
      await TestBed.configureTestingModule({
        imports: [DeptListComponent, NoopAnimationsModule],
        providers: [
          provideRouter([]),
          {
            provide: SuperAdminService,
            useValue: { watchDepartments: () => of(depts) },
          },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(DeptListComponent);
      f.detectChanges();
      await f.whenStable();
      f.detectChanges();
      return f;
    }

    it('computes activeCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.activeCount()).toBe(2);
    });

    it('computes pendingCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.pendingCount()).toBe(1);
    });

    it('computes totalCount correctly', async () => {
      const f = await setup(mockDepts);
      expect(f.componentInstance.totalCount()).toBe(3);
    });

    it('renders a row per department', async () => {
      const f = await setup(mockDepts);
      const rows = f.nativeElement.querySelectorAll('tr[mat-row]');
      expect(rows.length).toBe(3);
    });

    it('shows empty state when no departments', async () => {
      const f = await setup([]);
      expect(f.nativeElement.textContent).toContain('Aucun département');
    });
  });
});

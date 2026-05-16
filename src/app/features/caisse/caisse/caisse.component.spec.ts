import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NEVER, of } from 'rxjs';
import { CaisseComponent } from './caisse.component';
import { CaisseService } from '../../../core/services/caisse.service';
import { AuthService } from '../../../core/services/auth.service';
import { CaisseDoc, TransactionDoc } from '../../../core/models/caisse.model';

const mockCaisse: CaisseDoc = {
  solde: 15000,
  totalEntrees: 15000,
  totalSorties: 0,
  updatedAt: { seconds: 1000, nanoseconds: 0 } as any,
};

const mockTx: TransactionDoc = {
  id: 'tx-1',
  montant: 5000,
  type: 'debit',
  categorie: 'nourriture',
  libelle: 'Repas annuel',
  source: 'manuel',
  cycleId: null,
  createdBy: 'uid-1',
  createdAt: { seconds: 1000, nanoseconds: 0, toDate: () => new Date(1000000) } as any,
};

describe('CaisseComponent', () => {
  it('shows skeleton (.caisse-loading) when data is pending', () => {
    TestBed.configureTestingModule({
      imports: [CaisseComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: { getClaims: () => NEVER } },
        { provide: CaisseService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    });
    const f = TestBed.createComponent(CaisseComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.caisse-loading')).toBeTruthy();
    expect(f.nativeElement.querySelector('.caisse-container')).toBeNull();
  });

  describe('loaded state', () => {
    let component: CaisseComponent;
    let fixture: ComponentFixture<CaisseComponent>;
    let authMock: { getClaims: jest.Mock };
    let caisseMock: { watchCaisse: jest.Mock; watchTransactions: jest.Mock };
    let dialogMock: { open: jest.Mock };

    const createComponent = async (transactions: TransactionDoc[] = []) => {
      caisseMock.watchTransactions.mockReturnValue(of(transactions));
      fixture = TestBed.createComponent(CaisseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    beforeEach(async () => {
      authMock = { getClaims: jest.fn().mockResolvedValue({ deptId: 'dept-1' }) };
      caisseMock = {
        watchCaisse: jest.fn().mockReturnValue(of(mockCaisse)),
        watchTransactions: jest.fn().mockReturnValue(of([])),
      };
      dialogMock = { open: jest.fn() };

      await TestBed.configureTestingModule({
        imports: [CaisseComponent, NoopAnimationsModule],
        providers: [
          { provide: AuthService, useValue: authMock },
          { provide: CaisseService, useValue: caisseMock },
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
    });

    it('should be created', async () => {
      await createComponent();
      expect(component).toBeTruthy();
    });

    it('should display solde from caisse doc', async () => {
      await createComponent();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('15');
    });

    it('should show empty state when no transactions', async () => {
      await createComponent([]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Aucune dépense enregistrée');
    });

    it('should show transaction row when transactions exist', async () => {
      await createComponent([mockTx]);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain('Nourriture');
    });

    it('openAddDialog() should open AddTransactionDialogComponent', async () => {
      await createComponent();
      component.openAddDialog();
      expect(dialogMock.open).toHaveBeenCalled();
    });
  });
});

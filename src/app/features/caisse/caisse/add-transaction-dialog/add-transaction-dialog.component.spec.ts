import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AddTransactionDialogComponent } from './add-transaction-dialog.component';
import { CaisseService } from '../../../../core/services/caisse.service';

describe('AddTransactionDialogComponent', () => {
  let component: AddTransactionDialogComponent;
  let fixture: ComponentFixture<AddTransactionDialogComponent>;
  let caisseMock: jest.Mocked<Pick<CaisseService, 'addTransaction'>>;
  let dialogRefMock: { close: jest.Mock };

  beforeEach(async () => {
    caisseMock = { addTransaction: jest.fn().mockResolvedValue(undefined) };
    dialogRefMock = { close: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AddTransactionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: CaisseService, useValue: caisseMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { deptId: 'dept-1' } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTransactionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('submit() should not call addTransaction when form is invalid', async () => {
    await component.submit();
    expect(caisseMock.addTransaction).not.toHaveBeenCalled();
  });

  it('submit() should call addTransaction and close dialog on success', async () => {
    component.form.setValue({ montant: 5000, categorie: 'nourriture', libelle: 'Repas' });
    await component.submit();
    expect(caisseMock.addTransaction).toHaveBeenCalledWith({
      deptId: 'dept-1',
      montant: 5000,
      categorie: 'nourriture',
      libelle: 'Repas',
    });
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('submit() should set solde insuffisant error on failed-precondition', async () => {
    caisseMock.addTransaction.mockRejectedValue({ code: 'functions/failed-precondition' });
    component.form.setValue({ montant: 99999, categorie: 'nourriture', libelle: '' });
    await component.submit();
    expect(component.error()).toContain('Solde insuffisant');
    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });
});

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BeneficiaryConfirmComponent } from './beneficiary-confirm.component';
import { CycleService } from '../../../../core/services/cycle.service';

describe('BeneficiaryConfirmComponent', () => {
  function setup(cycleSvcOverride: any = {}) {
    TestBed.configureTestingModule({
      imports: [BeneficiaryConfirmComponent, NoopAnimationsModule],
      providers: [
        {
          provide: CycleService,
          useValue: {
            confirmReception: jest.fn().mockResolvedValue(undefined),
            ...cycleSvcOverride,
          },
        },
      ],
    });
    const f: ComponentFixture<BeneficiaryConfirmComponent> =
      TestBed.createComponent(BeneficiaryConfirmComponent);
    f.componentInstance.saisonId = 's1';
    f.componentInstance.cycleId = 'c1';
    f.componentInstance.montantVerse = 75000;
    f.detectChanges();
    return f;
  }

  it('displays montantVerse via FcfaPipe (contains FCFA)', () => {
    const f = setup();
    expect(f.nativeElement.textContent).toContain('FCFA');
    expect(f.nativeElement.textContent).toContain('75');
  });

  it('shows .alert-error class after failed confirm()', async () => {
    const f = setup({
      confirmReception: jest.fn().mockRejectedValue(new Error('Erreur test')),
    });
    await f.componentInstance.confirm();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert-error')).toBeTruthy();
  });
});

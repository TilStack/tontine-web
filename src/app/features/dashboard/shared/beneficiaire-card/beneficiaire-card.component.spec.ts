import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BeneficiaireCardComponent } from './beneficiaire-card.component';

const mockCycle: any = {
  id: 'c1',
  index: 1,
  beneficiaryUid: 'u1',
  status: 'open',
  totalPaid: 3,
  montantVerse: 0,
  confirmedAt: null,
  confirmedBy: null,
  closedAt: null,
  closedBy: null,
  deadline: { seconds: 9999999, nanoseconds: 0 },
  createdAt: { seconds: 0, nanoseconds: 0 },
  montantCaisse: 0,
};

describe('BeneficiaireCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [BeneficiaireCardComponent, NoopAnimationsModule],
    });
    const f = TestBed.createComponent(BeneficiaireCardComponent);
    f.componentInstance.cycle = mockCycle;
    f.componentInstance.members = [
      {
        uid: 'u1',
        displayName: 'Alice',
        email: 'a@b.com',
        role: 'membre',
        rang: 1,
        hasBenefited: false,
        joinedAt: {} as any,
        mustResetPassword: false,
      },
    ];
    f.componentInstance.montantCotisation = 25000;
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});

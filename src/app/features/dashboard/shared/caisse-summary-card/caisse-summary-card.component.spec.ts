import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { CaisseSummaryCardComponent } from './caisse-summary-card.component';

describe('CaisseSummaryCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [CaisseSummaryCardComponent, NoopAnimationsModule],
      providers: [{ provide: MatDialog, useValue: { open: jest.fn() } }],
    });
    const f = TestBed.createComponent(CaisseSummaryCardComponent);
    f.componentInstance.caisse = undefined;
    f.componentInstance.transactions = [];
    f.componentInstance.deptId = 'd1';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});

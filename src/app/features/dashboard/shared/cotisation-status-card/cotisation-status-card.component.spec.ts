import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationStatusCardComponent } from './cotisation-status-card.component';

describe('CotisationStatusCardComponent (smoke)', () => {
  it('renders without error with minimal inputs', () => {
    TestBed.configureTestingModule({
      imports: [CotisationStatusCardComponent, NoopAnimationsModule],
    });
    const fixture = TestBed.createComponent(CotisationStatusCardComponent);
    fixture.componentInstance.cycleStatus = null;
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});

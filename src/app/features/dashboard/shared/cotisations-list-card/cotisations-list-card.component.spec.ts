import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationsListCardComponent } from './cotisations-list-card.component';

describe('CotisationsListCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [CotisationsListCardComponent, NoopAnimationsModule],
    });
    const f = TestBed.createComponent(CotisationsListCardComponent);
    f.componentInstance.cotisations = [];
    f.componentInstance.members = [];
    f.componentInstance.cycleStatus = 'open';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});

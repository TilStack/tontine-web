import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProgressionCardComponent } from './progression-card.component';

describe('ProgressionCardComponent (smoke)', () => {
  it('renders without error', () => {
    TestBed.configureTestingModule({
      imports: [ProgressionCardComponent, NoopAnimationsModule],
    });
    const fixture = TestBed.createComponent(ProgressionCardComponent);
    fixture.componentInstance.paidCount = 3;
    fixture.componentInstance.totalCount = 10;
    fixture.componentInstance.montantCotisation = 25000;
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });
});

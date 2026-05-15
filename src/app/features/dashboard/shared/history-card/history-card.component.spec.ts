import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { HistoryCardComponent } from './history-card.component';

describe('HistoryCardComponent (smoke)', () => {
  it('renders without error with empty cycles', () => {
    TestBed.configureTestingModule({
      imports: [HistoryCardComponent, NoopAnimationsModule],
      providers: [provideRouter([])],
    });
    const f = TestBed.createComponent(HistoryCardComponent);
    f.componentInstance.closedCycles = [];
    f.componentInstance.members = [];
    f.componentInstance.myUid = 'u1';
    f.detectChanges();
    expect(f.nativeElement).toBeTruthy();
  });
});

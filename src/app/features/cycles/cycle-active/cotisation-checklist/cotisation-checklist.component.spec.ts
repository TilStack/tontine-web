import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CotisationChecklistComponent } from './cotisation-checklist.component';

describe('CotisationChecklistComponent', () => {
  function setup(members: any[], cotisations: any[], canMarkPaid = false) {
    TestBed.configureTestingModule({
      imports: [CotisationChecklistComponent, NoopAnimationsModule],
    });
    const f: ComponentFixture<CotisationChecklistComponent> =
      TestBed.createComponent(CotisationChecklistComponent);
    f.componentInstance.members = members;
    f.componentInstance.cotisations = cotisations;
    f.componentInstance.canMarkPaid = canMarkPaid;
    f.detectChanges();
    return f;
  }

  it('renders one list item per member', () => {
    const f = setup(
      [
        { uid: 'u1', displayName: 'Alice' },
        { uid: 'u2', displayName: 'Bob' },
      ],
      [{ uid: 'u1', paid: true, penalized: false }],
    );
    expect(f.nativeElement.querySelectorAll('mat-list-item').length).toBe(2);
  });

  it('applies .checklist__icon--paid on paid member icon', () => {
    const f = setup(
      [{ uid: 'u1', displayName: 'Alice' }],
      [{ uid: 'u1', paid: true, penalized: false }],
    );
    expect(f.nativeElement.querySelector('.checklist__icon--paid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.checklist__icon--unpaid')).toBeNull();
  });

  it('applies .checklist__icon--unpaid on unpaid member icon', () => {
    const f = setup(
      [{ uid: 'u1', displayName: 'Alice' }],
      [{ uid: 'u1', paid: false, penalized: false }],
    );
    expect(f.nativeElement.querySelector('.checklist__icon--unpaid')).toBeTruthy();
    expect(f.nativeElement.querySelector('.checklist__icon--paid')).toBeNull();
  });
});

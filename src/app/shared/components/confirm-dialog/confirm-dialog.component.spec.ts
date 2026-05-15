import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

const errorData: ConfirmDialogData = {
  title: 'Forcer la clôture',
  message: "Les membres n'ayant pas payé seront pénalisés.",
  confirmLabel: 'Forcer la clôture',
  confirmColor: 'error',
};

function buildFixture(data: ConfirmDialogData): ComponentFixture<ConfirmDialogComponent> {
  TestBed.configureTestingModule({
    imports: [ConfirmDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: jest.fn() } },
    ],
  });
  const f = TestBed.createComponent(ConfirmDialogComponent);
  f.detectChanges();
  return f;
}

describe('ConfirmDialogComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders title, message, and confirmLabel from dialog data', () => {
    const f = buildFixture(errorData);
    const text: string = f.nativeElement.textContent;
    expect(text).toContain(errorData.title);
    expect(text).toContain(errorData.message);
    expect(text).toContain(errorData.confirmLabel);
  });

  it('confirm button has --error class when confirmColor is "error"', () => {
    const f = buildFixture(errorData);
    const btn: HTMLElement = f.nativeElement.querySelector('.confirm-dialog__confirm');
    expect(btn.classList.contains('confirm-dialog__confirm--error')).toBe(true);
    expect(btn.classList.contains('confirm-dialog__confirm--warning')).toBe(false);
  });

  it('confirm button has --warning class when confirmColor is "warning"', () => {
    const f = buildFixture({ ...errorData, confirmColor: 'warning' });
    const btn: HTMLElement = f.nativeElement.querySelector('.confirm-dialog__confirm');
    expect(btn.classList.contains('confirm-dialog__confirm--warning')).toBe(true);
    expect(btn.classList.contains('confirm-dialog__confirm--error')).toBe(false);
  });

  it('cancel button is present', () => {
    const f = buildFixture(errorData);
    const cancel = f.nativeElement.querySelector('[mat-stroked-button]');
    expect(cancel).toBeTruthy();
  });
});

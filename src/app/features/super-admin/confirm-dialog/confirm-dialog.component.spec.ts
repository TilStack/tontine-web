import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SaConfirmDialogComponent, SaConfirmDialogData } from './confirm-dialog.component';

function setup(data: SaConfirmDialogData) {
  const closeSpy = jest.fn();
  TestBed.configureTestingModule({
    imports: [SaConfirmDialogComponent, NoopAnimationsModule],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: closeSpy } },
    ],
  });
  const f = TestBed.createComponent(SaConfirmDialogComponent);
  f.detectChanges();
  return { f, closeSpy };
}

describe('SaConfirmDialogComponent', () => {
  it('confirm button is disabled when requiresComment and comment is empty', () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(true);
  });

  it('confirm button is enabled after typing a comment', async () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    f.componentInstance.comment.set('Some reason');
    f.detectChanges();
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(false);
  });

  it('confirm() closes dialog with { confirmed: true, comment }', () => {
    const { f, closeSpy } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: true,
      commentLabel: 'Raison',
      confirmLabel: 'Confirmer',
      dangerMode: true,
    });
    f.componentInstance.comment.set('Force close reason');
    f.componentInstance.confirm();
    expect(closeSpy).toHaveBeenCalledWith({ confirmed: true, comment: 'Force close reason' });
  });

  it('cancel() closes dialog with undefined', () => {
    const { f, closeSpy } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: false,
      confirmLabel: 'OK',
      dangerMode: false,
    });
    f.componentInstance.cancel();
    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });

  it('confirm button is enabled when requiresComment is false even with empty comment', () => {
    const { f } = setup({
      title: 'Test',
      message: 'Are you sure?',
      requiresComment: false,
      confirmLabel: 'OK',
      dangerMode: false,
    });
    const confirmBtn: HTMLButtonElement = f.nativeElement.querySelector('.sa-confirm__confirm-btn');
    expect(confirmBtn.disabled).toBe(false);
  });
});

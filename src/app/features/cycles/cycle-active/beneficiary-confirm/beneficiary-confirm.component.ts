import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
  MatCardActions,
} from '@angular/material/card';
import { DecimalPipe } from '@angular/common';
import { CycleService } from '../../../../core/services/cycle.service';

@Component({
  selector: 'app-beneficiary-confirm',
  standalone: true,
  imports: [
    MatButton,
    MatProgressSpinner,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    DecimalPipe,
  ],
  templateUrl: './beneficiary-confirm.component.html',
})
export class BeneficiaryConfirmComponent {
  @Input({ required: true }) saisonId!: string;
  @Input({ required: true }) cycleId!: string;
  @Input({ required: true }) montantVerse!: number;

  @Output() confirmed = new EventEmitter<void>();

  private cycleService = inject(CycleService);

  loading = signal(false);
  error = signal<string | null>(null);

  async confirm(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.cycleService.confirmReception({
        saisonId: this.saisonId,
        cycleId: this.cycleId,
      });
      this.confirmed.emit();
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur lors de la confirmation.');
    } finally {
      this.loading.set(false);
    }
  }
}

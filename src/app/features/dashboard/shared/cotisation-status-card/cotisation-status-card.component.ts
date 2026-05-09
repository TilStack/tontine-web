import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { CycleStatus, Cotisation } from '../../../../core/models/cycle.model';

@Component({
  selector: 'app-cotisation-status-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Ma cotisation</h3>
        @if (cycleStatus === 'closed') {
          <mat-chip-set><mat-chip>Cycle clôturé</mat-chip></mat-chip-set>
        } @else if (cotisation?.paid) {
          <mat-chip-set><mat-chip color="primary" highlighted>Payé ✅</mat-chip></mat-chip-set>
        } @else {
          <mat-chip-set><mat-chip>En attente ⏳</mat-chip></mat-chip-set>
          <p>Montant dû : {{ montantCotisation | number }} FCFA</p>
          @if (deadline) {
            <p>Échéance : {{ deadline | date:'dd/MM/yyyy' }}</p>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class CotisationStatusCardComponent {
  @Input({ required: true }) cycleStatus!: CycleStatus | null;
  @Input() cotisation: Cotisation | undefined;
  @Input() montantCotisation: number = 0;
  @Input() deadline: Date | null = null;
}

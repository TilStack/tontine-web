import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-beneficiaire-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Bénéficiaire du cycle</h3>
        <p><strong>{{ beneficiaryName }}</strong></p>
        <p>Montant : {{ montantEstime | number }} FCFA</p>
        @if (cycle.confirmedAt) {
          <mat-chip-set>
            <mat-chip color="primary" highlighted>
              Confirmé le {{ cycle.confirmedAt.toDate() | date:'dd/MM/yyyy' }}
            </mat-chip>
          </mat-chip-set>
        } @else {
          <mat-chip-set><mat-chip>En attente de confirmation</mat-chip></mat-chip-set>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class BeneficiaireCardComponent {
  @Input({ required: true }) cycle!: Cycle;
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) montantCotisation!: number;

  get beneficiaryName(): string {
    return this.members.find((m) => m.uid === this.cycle.beneficiaryUid)?.displayName
      ?? this.cycle.beneficiaryUid;
  }

  get montantEstime(): number {
    if (this.cycle.status === 'closed') return this.cycle.montantVerse;
    return this.cycle.totalPaid * this.montantCotisation;
  }
}

import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-beneficiaire-card',
  standalone: true,
  imports: [MatCard, MatCardContent, DatePipe, FcfaPipe],
  templateUrl: './beneficiaire-card.component.html',
  styleUrl: './beneficiaire-card.component.scss',
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

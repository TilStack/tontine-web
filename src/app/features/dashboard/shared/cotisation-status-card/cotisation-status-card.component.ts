import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { CycleStatus, Cotisation } from '../../../../core/models/cycle.model';

@Component({
  selector: 'app-cotisation-status-card',
  standalone: true,
  imports: [MatCard, MatCardContent, DatePipe, FcfaPipe],
  templateUrl: './cotisation-status-card.component.html',
  styleUrl: './cotisation-status-card.component.scss',
})
export class CotisationStatusCardComponent {
  @Input({ required: true }) cycleStatus!: CycleStatus | null;
  @Input() cotisation: Cotisation | undefined;
  @Input() montantCotisation: number = 0;
  @Input() deadline: Date | null = null;
}

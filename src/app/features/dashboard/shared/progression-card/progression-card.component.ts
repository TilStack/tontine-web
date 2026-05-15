import { Component, Input } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';

@Component({
  selector: 'app-progression-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatProgressBar, FcfaPipe],
  templateUrl: './progression-card.component.html',
  styleUrl: './progression-card.component.scss',
})
export class ProgressionCardComponent {
  @Input({ required: true }) paidCount!: number;
  @Input({ required: true }) totalCount!: number;
  @Input({ required: true }) montantCotisation!: number;

  get progressPct(): number {
    if (!this.totalCount) return 0;
    return Math.min((this.paidCount / this.totalCount) * 100, 100);
  }
}

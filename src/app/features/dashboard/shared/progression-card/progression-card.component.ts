import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'app-progression-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatProgressBar, DecimalPipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Progression collective</h3>
        <p>{{ paidCount }} / {{ totalCount }} membres ont cotisé</p>
        <mat-progress-bar mode="determinate" [value]="progressPct"></mat-progress-bar>
        <p style="margin-top:8px">
          Collecté : {{ paidCount * montantCotisation | number }} /
          {{ totalCount * montantCotisation | number }} FCFA
        </p>
      </mat-card-content>
    </mat-card>
  `,
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

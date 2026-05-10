import { Component, Input } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-history-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatChip, MatChipSet, RouterLink, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Historique récent</h3>
        @if (recentCycles.length === 0) {
          <p>Aucun cycle clôturé.</p>
        } @else {
          @for (c of recentCycles; track c.id) {
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #eee">
              <span>Cycle #{{ c.index }}</span>
              <span>{{ getMemberName(c.beneficiaryUid) }}</span>
              <span>{{ c.montantVerse | number }} FCFA</span>
              <span>{{ c.closedAt?.toDate() | date:'dd/MM/yy' }}</span>
              @if (c.beneficiaryUid === myUid) {
                <mat-chip-set><mat-chip color="accent" highlighted>Bénéficiaire</mat-chip></mat-chip-set>
              }
            </div>
          }
        }
        <a routerLink="/app/cycles/history" style="display:block;margin-top:8px">
          Voir tout l'historique →
        </a>
      </mat-card-content>
    </mat-card>
  `,
})
export class HistoryCardComponent {
  @Input({ required: true }) closedCycles!: Cycle[];
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) myUid!: string;

  get recentCycles(): Cycle[] {
    return [...this.closedCycles].slice(-3).reverse();
  }

  getMemberName(uid: string): string {
    return this.members.find((m) => m.uid === uid)?.displayName ?? uid;
  }
}

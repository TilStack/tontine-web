import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-history-card',
  standalone: true,
  imports: [MatCard, MatCardContent, RouterLink, DatePipe, FcfaPipe],
  templateUrl: './history-card.component.html',
  styleUrl: './history-card.component.scss',
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

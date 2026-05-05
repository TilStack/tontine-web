import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Cotisation } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

@Component({
  selector: 'app-cotisation-checklist',
  standalone: true,
  imports: [MatListModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './cotisation-checklist.component.html',
})
export class CotisationChecklistComponent {
  @Input({ required: true }) cotisations: Cotisation[] = [];
  @Input({ required: true }) members: UserProfile[] = [];
  @Input({ required: true }) canMarkPaid: boolean = false;
  @Input() markingUid: string | null = null;

  @Output() markPaid = new EventEmitter<string>();

  getMemberName(uid: string): string {
    return this.members.find((m) => m.uid === uid)?.displayName ?? uid;
  }

  getCotisation(uid: string): Cotisation | undefined {
    return this.cotisations.find((c) => c.uid === uid);
  }

  onMarkPaid(uid: string): void {
    this.markPaid.emit(uid);
  }
}

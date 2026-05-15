import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Cotisation, CycleStatus } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';

interface Row {
  uid: string;
  displayName: string;
  cotisation: Cotisation | undefined;
}

@Component({
  selector: 'app-cotisations-list-card',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton, MatProgressSpinner,
  ],
  templateUrl: './cotisations-list-card.component.html',
  styleUrl: './cotisations-list-card.component.scss',
})
export class CotisationsListCardComponent {
  @Input({ required: true }) cotisations!: Cotisation[];
  @Input({ required: true }) members!: UserProfile[];
  @Input({ required: true }) cycleStatus!: CycleStatus;
  @Input() markingUid: string | null = null;

  @Output() markPaid = new EventEmitter<string>();

  readonly columns = ['name', 'status', 'action'];

  get rows(): Row[] {
    return this.members.map((m) => ({
      uid: m.uid,
      displayName: m.displayName,
      cotisation: this.cotisations.find((c) => c.uid === m.uid),
    }));
  }

  get paidCount(): number {
    return this.cotisations.filter((c) => c.paid).length;
  }
}

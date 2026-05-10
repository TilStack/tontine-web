import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MatCard, MatCardContent } from '@angular/material/card';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatChip, MatChipSet } from '@angular/material/chips';
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
    MatButton, MatProgressSpinner, MatChip, MatChipSet,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Cotisations — {{ paidCount }} / {{ members.length }} payées</h3>
        <table mat-table [dataSource]="rows" style="width:100%">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Membre</th>
            <td mat-cell *matCellDef="let r">{{ r.displayName }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Statut</th>
            <td mat-cell *matCellDef="let r">
              @if (r.cotisation?.paid) {
                <mat-chip-set><mat-chip color="primary" highlighted>Payé ✅</mat-chip></mat-chip-set>
              } @else {
                <mat-chip-set><mat-chip>En attente</mat-chip></mat-chip-set>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              @if (!r.cotisation?.paid && cycleStatus === 'open') {
                @if (markingUid === r.uid) {
                  <mat-progress-spinner mode="indeterminate" diameter="20"></mat-progress-spinner>
                } @else {
                  <button mat-stroked-button (click)="markPaid.emit(r.uid)">
                    Enregistrer paiement
                  </button>
                }
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
      </mat-card-content>
    </mat-card>
  `,
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

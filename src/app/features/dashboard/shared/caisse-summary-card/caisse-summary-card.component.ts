import { Component, Input, inject } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CaisseDoc, TransactionDoc } from '../../../../core/models/caisse.model';
import { AddTransactionDialogComponent } from '../../../caisse/caisse/add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse-summary-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, DecimalPipe, DatePipe],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Caisse</h3>
        <p style="font-size:1.4rem;font-weight:600">
          {{ caisse?.solde | number }} FCFA
        </p>
        @if (recentTransactions.length > 0) {
          @for (t of recentTransactions; track t.id) {
            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid #eee">
              <span>{{ t.libelle || t.categorie }}</span>
              <span [style.color]="t.type === 'credit' ? 'green' : 'red'">
                {{ t.type === 'credit' ? '+' : '-' }}{{ t.montant | number }} FCFA
              </span>
              <span style="color:#999;font-size:.8rem">
                {{ t.createdAt.toDate() | date:'dd/MM' }}
              </span>
            </div>
          }
        }
      </mat-card-content>
      <mat-card-actions>
        <button mat-stroked-button (click)="openAddDialog()">
          Ajouter une transaction
        </button>
      </mat-card-actions>
    </mat-card>
  `,
})
export class CaisseSummaryCardComponent {
  @Input({ required: true }) caisse: CaisseDoc | undefined;
  @Input({ required: true }) transactions!: TransactionDoc[];
  @Input({ required: true }) deptId!: string;

  private dialog = inject(MatDialog);

  get recentTransactions(): TransactionDoc[] {
    return this.transactions.slice(0, 5);
  }

  openAddDialog(): void {
    this.dialog.open(AddTransactionDialogComponent, {
      data: { deptId: this.deptId },
      width: '420px',
    });
  }
}

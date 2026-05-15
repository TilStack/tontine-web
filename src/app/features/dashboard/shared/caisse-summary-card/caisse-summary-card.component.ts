import { Component, Input, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { CaisseDoc, TransactionDoc } from '../../../../core/models/caisse.model';
import { AddTransactionDialogComponent } from '../../../caisse/caisse/add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse-summary-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, DatePipe, FcfaPipe],
  templateUrl: './caisse-summary-card.component.html',
  styleUrl: './caisse-summary-card.component.scss',
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

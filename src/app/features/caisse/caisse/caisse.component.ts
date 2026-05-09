import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow } from '@angular/material/table';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { DecimalPipe, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { AddTransactionDialogComponent } from './add-transaction-dialog/add-transaction-dialog.component';

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatButton,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatIcon, MatProgressSpinner,
    DecimalPipe, DatePipe,
  ],
  templateUrl: './caisse.component.html',
})
export class CaisseComponent {
  private auth = inject(AuthService);
  private caisseService = inject(CaisseService);
  private dialog = inject(MatDialog);

  displayedColumns = ['date', 'categorie', 'libelle', 'montant'];

  private readonly categorieLabels: Record<string, string> = {
    nourriture: 'Nourriture',
    sortie: 'Sortie',
    evenement: 'Événement',
    materiel: 'Matériel',
    autre: 'Autre',
  };

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      return combineLatest([
        this.caisseService.watchCaisse(deptId),
        this.caisseService.watchTransactions(deptId),
      ]).pipe(map(([caisse, transactions]) => ({ deptId, caisse, transactions })));
    })
  );

  data = toSignal(this.data$);

  openAddDialog(): void {
    const deptId = this.data()?.deptId;
    if (!deptId) return;
    this.dialog.open(AddTransactionDialogComponent, {
      data: { deptId },
      width: '420px',
    });
  }

  getCategorieLabel(cat: string): string {
    return this.categorieLabels[cat] ?? cat;
  }
}

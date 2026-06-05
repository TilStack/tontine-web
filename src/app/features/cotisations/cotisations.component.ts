import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, map, catchError, Observable } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import {
  Firestore, collection, collectionData, query, limit, where,
} from '@angular/fire/firestore';

interface CotisationItem {
  uid: string;
  paid: boolean;
  paidAt?: { toDate(): Date };
  penalized: boolean;
}

interface CotisationsData {
  cycleId: string | null;
  cotisations: CotisationItem[];
}

@Component({
  selector: 'app-cotisations',
  standalone: true,
  imports: [
    MatCard, MatCardContent,
    MatProgressSpinner,
    MatIcon,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    DatePipe,
  ],
  template: `
    <div style="padding:24px;max-width:900px;margin:0 auto">
      <h2 style="margin:0 0 24px">Cotisations</h2>

      @if (!data()) {
        <div style="display:flex;justify-content:center;padding:48px">
          <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        </div>
      } @else if (!data()!.cycleId) {
        <mat-card>
          <mat-card-content style="text-align:center;padding:48px;color:#666">
            Aucun cycle actif en ce moment.
          </mat-card-content>
        </mat-card>
      } @else if (data()!.cotisations.length === 0) {
        <mat-card>
          <mat-card-content style="text-align:center;padding:48px;color:#666">
            Aucune cotisation enregistrée pour ce cycle.
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-card>
          <mat-card-content style="padding:0">
            <table mat-table [dataSource]="data()!.cotisations" style="width:100%">
              <ng-container matColumnDef="uid">
                <th mat-header-cell *matHeaderCellDef>Membre</th>
                <td mat-cell *matCellDef="let c">{{ c.uid }}</td>
              </ng-container>
              <ng-container matColumnDef="statut">
                <th mat-header-cell *matHeaderCellDef>Statut</th>
                <td mat-cell *matCellDef="let c">
                  @if (c.paid) {
                    <span style="color:green;display:flex;align-items:center;gap:4px">
                      <mat-icon style="font-size:16px;height:16px;width:16px">check_circle</mat-icon>Payé
                    </span>
                  } @else if (c.penalized) {
                    <span style="color:red;display:flex;align-items:center;gap:4px">
                      <mat-icon style="font-size:16px;height:16px;width:16px">warning</mat-icon>Pénalisé
                    </span>
                  } @else {
                    <span style="color:#f59e0b;display:flex;align-items:center;gap:4px">
                      <mat-icon style="font-size:16px;height:16px;width:16px">schedule</mat-icon>En attente
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="paidAt">
                <th mat-header-cell *matHeaderCellDef>Date paiement</th>
                <td mat-cell *matCellDef="let c">
                  {{ c.paidAt ? (c.paidAt.toDate() | date:'dd/MM/yyyy') : '—' }}
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class CotisationsComponent {
  private auth = inject(AuthService);
  private firestore = inject(Firestore);

  displayedColumns = ['uid', 'statut', 'paidAt'];

  private data$: Observable<CotisationsData | null> = from(this.auth.getClaims()).pipe(
    switchMap((claims): Observable<CotisationsData | null> => {
      if (!claims?.deptId) return of(null as CotisationsData | null);
      const deptId = claims.deptId;
      const saisonsRef = collection(this.firestore, `departments/${deptId}/saisons`);
      const activeSaisonQ = query(saisonsRef, where('status', '==', 'active'), limit(1));
      return (collectionData(activeSaisonQ, { idField: 'id' }) as any).pipe(
        switchMap((saisons: any[]) => {
          if (!saisons.length) return of({ cycleId: null, cotisations: [] as CotisationItem[] });
          const saisonId = saisons[0]['id'];
          const cyclesRef = collection(this.firestore, `departments/${deptId}/saisons/${saisonId}/cycles`);
          const openCycleQ = query(cyclesRef, where('status', '==', 'open'), limit(1));
          return (collectionData(openCycleQ, { idField: 'id' }) as any).pipe(
            switchMap((cycles: any[]) => {
              if (!cycles.length) return of({ cycleId: null, cotisations: [] as CotisationItem[] });
              const cycleId = cycles[0]['id'];
              const cotisRef = collection(
                this.firestore,
                `departments/${deptId}/saisons/${saisonId}/cycles/${cycleId}/cotisations`
              );
              return (collectionData(cotisRef, { idField: 'uid' }) as any).pipe(
                map((cotisations: CotisationItem[]) => ({ cycleId, cotisations }))
              );
            })
          );
        }),
        catchError(() => of({ cycleId: null, cotisations: [] as CotisationItem[] }))
      );
    }),
    catchError(() => of(null as CotisationsData | null))
  );

  data = toSignal(this.data$, { initialValue: null });
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow } from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { DepartmentRequest } from '../../../core/models/department-request.model';

@Component({
  selector: 'app-dept-requests',
  standalone: true,
  imports: [
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton, MatChip, MatChipSet,
  ],
  template: `
    <h2>Demandes de création de département</h2>

    @if (loading()) {
      <p>Chargement…</p>
    } @else if (requests().length === 0) {
      <p>Aucune demande en attente.</p>
    } @else {
      <table mat-table [dataSource]="requests()" style="width: 100%">
        <ng-container matColumnDef="requesterName">
          <th mat-header-cell *matHeaderCellDef>Nom</th>
          <td mat-cell *matCellDef="let r">{{ r.requesterName }}</td>
        </ng-container>
        <ng-container matColumnDef="requesterEmail">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let r">{{ r.requesterEmail }}</td>
        </ng-container>
        <ng-container matColumnDef="deptName">
          <th mat-header-cell *matHeaderCellDef>Département</th>
          <td mat-cell *matCellDef="let r">{{ r.deptName }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let r">
            <button mat-flat-button color="primary" (click)="approve(r.id)">
              Approuver
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    }
  `,
})
export class DeptRequestsComponent implements OnInit {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  readonly columns = ['requesterName', 'requesterEmail', 'deptName', 'actions'];
  requests = signal<(DepartmentRequest & { id: string })[]>([]);
  loading = signal(true);

  async ngOnInit(): Promise<void> {
    const col = collection(this.firestore, 'department_requests');
    const q = query(col, where('status', '==', 'pending'));
    const snap = await getDocs(q);
    this.requests.set(
      snap.docs.map((d) => {
        const data = d.data() as Omit<DepartmentRequest, 'id'>;
        return { id: d.id, ...data };
      })
    );
    this.loading.set(false);
  }

  async approve(requestId: string): Promise<void> {
    const fn = httpsCallable<{ requestId: string }, { deptId: string }>(
      this.functions,
      'provisionDepartment'
    );
    await fn({ requestId });
    this.requests.update((list) => list.filter((r) => r.id !== requestId));
  }
}

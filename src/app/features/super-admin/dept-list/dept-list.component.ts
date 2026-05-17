import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { SuperAdminService } from '../super-admin.service';

@Component({
  selector: 'app-dept-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef, MatCellDef, MatRowDef,
    MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    MatButton,
    MatChip, MatChipSet,
    DatePipe,
  ],
  templateUrl: './dept-list.component.html',
  styleUrl: './dept-list.component.scss',
})
export class DeptListComponent {
  private saService = inject(SuperAdminService);

  departments = toSignal(this.saService.watchDepartments());

  activeCount = computed(() => this.departments()?.filter((d) => d.status === 'active').length ?? 0);
  pendingCount = computed(() => this.departments()?.filter((d) => d.status === 'pending').length ?? 0);
  totalCount = computed(() => this.departments()?.length ?? 0);

  displayedColumns = ['name', 'status', 'createdAt', 'actions'];
}

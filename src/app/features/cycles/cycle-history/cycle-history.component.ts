import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-cycle-history',
  standalone: true,
  imports: [MatTableModule, MatIconModule, MatProgressSpinnerModule, MatCardModule, DatePipe, DecimalPipe],
  templateUrl: './cycle-history.component.html',
})
export class CycleHistoryComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);

  displayedColumns = ['index', 'beneficiary', 'montantVerse', 'montantCaisse', 'closedAt', 'confirmed'];

  private data$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
      ]).pipe(
        switchMap(([saison, members]) => {
          if (!saison) return of({ cycles: [], members });
          return this.cycleService.watchClosedCycles(deptId, saison.id).pipe(
            map((cycles) => ({ cycles, members }))
          );
        })
      );
    })
  );

  data = toSignal(this.data$);

  getMemberName(uid: string): string {
    return this.data()?.members?.find((m: UserProfile) => m.uid === uid)?.displayName ?? uid;
  }
}

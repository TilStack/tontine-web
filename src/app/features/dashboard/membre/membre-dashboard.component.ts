import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CotisationStatusCardComponent } from '../shared/cotisation-status-card/cotisation-status-card.component';
import { ProgressionCardComponent } from '../shared/progression-card/progression-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';

@Component({
  selector: 'app-membre-dashboard',
  standalone: true,
  imports: [
    CotisationStatusCardComponent,
    ProgressionCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  templateUrl: './membre-dashboard.component.html',
  styleUrl: './membre-dashboard.component.scss',
})
export class MembreDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        this.userService.watchProfile(deptId, uid),
      ]).pipe(
        switchMap(([saison, members, myProfile]) => {
          if (!saison) {
            return of({ deptId, uid, saison: null, cycleData: null, closedCycles: [], members, myProfile });
          }
          return combineLatest([
            this.cycleService.watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex),
            this.cycleService.watchClosedCycles(deptId, saison.id),
          ]).pipe(
            map(([cycleData, closedCycles]) => ({ deptId, uid, saison, cycleData, closedCycles, members, myProfile }))
          );
        })
      );
    })
  );

  ctx = toSignal(this.context$);

  myCotisation() {
    const uid = this.ctx()?.uid;
    return this.ctx()?.cycleData?.cotisations.find((c) => c.uid === uid);
  }

  paidCount() {
    return this.ctx()?.cycleData?.cotisations.filter((c) => c.paid).length ?? 0;
  }
}

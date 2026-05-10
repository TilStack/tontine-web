import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
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
    MatProgressSpinner,
    CotisationStatusCardComponent,
    ProgressionCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  template: `
    @if (!ctx()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else {
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px">
        <app-cotisation-status-card
          [cycleStatus]="ctx()!.cycleData?.cycle?.status ?? null"
          [cotisation]="myCotisation()"
          [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0"
          [deadline]="ctx()!.cycleData?.cycle?.deadline?.toDate() ?? null">
        </app-cotisation-status-card>

        @if (ctx()!.cycleData) {
          <app-progression-card
            [paidCount]="paidCount()"
            [totalCount]="ctx()!.members.length"
            [montantCotisation]="ctx()!.saison!.montantCotisation">
          </app-progression-card>
        }

        @if (ctx()!.saison && ctx()!.cycleData) {
          <app-mon-rang-card
            [myProfile]="ctx()!.myProfile!"
            [memberOrder]="ctx()!.saison!.memberOrder"
            [cycle]="ctx()!.cycleData!.cycle"
            [saisonId]="ctx()!.saison!.id"
            [deptId]="ctx()!.deptId">
          </app-mon-rang-card>
        }

        <app-history-card
          [closedCycles]="ctx()!.closedCycles"
          [members]="ctx()!.members"
          [myUid]="ctx()!.uid">
        </app-history-card>
      </div>
    }
  `,
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

import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { CotisationsListCardComponent } from '../shared/cotisations-list-card/cotisations-list-card.component';
import { CaisseSummaryCardComponent } from '../shared/caisse-summary-card/caisse-summary-card.component';
import { BeneficiaireCardComponent } from '../shared/beneficiaire-card/beneficiaire-card.component';
import { CotisationStatusCardComponent } from '../shared/cotisation-status-card/cotisation-status-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';

@Component({
  selector: 'app-bureau-dashboard',
  standalone: true,
  imports: [
    CotisationsListCardComponent,
    CaisseSummaryCardComponent,
    BeneficiaireCardComponent,
    CotisationStatusCardComponent,
    MonRangCardComponent,
    HistoryCardComponent,
  ],
  templateUrl: './bureau-dashboard.component.html',
  styleUrl: './bureau-dashboard.component.scss',
})
export class BureauDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private caisseService = inject(CaisseService);

  markingUid = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser!.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        this.userService.watchProfile(deptId, uid),
        this.caisseService.watchCaisse(deptId),
        this.caisseService.watchTransactions(deptId),
      ]).pipe(
        switchMap(([saison, members, myProfile, caisse, transactions]) => {
          if (!saison) {
            return of({ deptId, uid, saison: null, cycleData: null, closedCycles: [], members, myProfile, caisse, transactions });
          }
          return combineLatest([
            this.cycleService.watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex),
            this.cycleService.watchClosedCycles(deptId, saison.id),
          ]).pipe(
            map(([cycleData, closedCycles]) => ({
              deptId, uid, saison, cycleData, closedCycles, members, myProfile, caisse, transactions,
            }))
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

  async onMarkPaid(uid: string): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.deptId || !ctx.saison || !ctx.cycleData) return;
    this.markingUid.set(uid);
    try {
      await this.cycleService.markCotisationPaid({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
        userId: uid,
      });
    } finally {
      this.markingUid.set(null);
    }
  }
}

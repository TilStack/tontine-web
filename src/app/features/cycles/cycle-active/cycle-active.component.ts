import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, map, combineLatest } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardActions } from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CotisationChecklistComponent } from './cotisation-checklist/cotisation-checklist.component';
import { BeneficiaryConfirmComponent } from './beneficiary-confirm/beneficiary-confirm.component';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-cycle-active',
  standalone: true,
  imports: [
    MatButton,
    MatIconButton,
    MatProgressSpinner,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardActions,
    MatChip,
    MatChipSet,
    RouterLink,
    DatePipe,
    DecimalPipe,
    CotisationChecklistComponent,
    BeneficiaryConfirmComponent,
  ],
  templateUrl: './cycle-active.component.html',
})
export class CycleActiveComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);

  markingUid = signal<string | null>(null);
  actionLoading = signal(false);
  actionError = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;

      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        from(this.auth.getClaims()).pipe(
          switchMap((c) =>
            c?.deptId && this.auth.currentUser?.uid
              ? this.userService.watchProfile(c.deptId, this.auth.currentUser.uid)
              : of(undefined)
          )
        ),
      ]).pipe(
        switchMap(([saison, members, myProfile]) => {
          if (!saison) {
            return of({ deptId, saison: null, cycleData: null, members, myProfile });
          }
          return this.cycleService
            .watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex)
            .pipe(map((cycleData) => ({ deptId, saison, cycleData, members, myProfile })));
        })
      );
    })
  );

  ctx = toSignal(this.context$);

  canMarkPaid = computed(() => {
    const role = this.ctx()?.myProfile?.role;
    return role === 'admin' || role === 'bureau';
  });

  canForceClose = computed(() => {
    const ctx = this.ctx();
    if (ctx?.myProfile?.role !== 'admin') return false;
    const cycle = ctx?.cycleData?.cycle;
    if (!cycle || cycle.status !== 'open') return false;
    return cycle.deadline.toDate() < new Date();
  });

  canOpenNext = computed(() => {
    const ctx = this.ctx();
    if (ctx?.myProfile?.role !== 'admin') return false;
    const cycle = ctx?.cycleData?.cycle;
    return cycle?.status === 'closed' && cycle.confirmedAt !== null;
  });

  showBeneficiaryConfirm = computed(() => {
    const ctx = this.ctx();
    const cycle = ctx?.cycleData?.cycle;
    const uid = this.auth.currentUser?.uid;
    return (
      cycle?.status === 'closed' &&
      uid === cycle.beneficiaryUid &&
      cycle.confirmedAt === null
    );
  });

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
    } catch (err: any) {
      this.actionError.set(err?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      this.markingUid.set(null);
    }
  }

  async onForceClose(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    try {
      await this.cycleService.forceCloseCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.actionError.set(err?.message ?? 'Erreur lors de la clôture.');
    } finally {
      this.actionLoading.set(false);
    }
  }

  async onOpenNext(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.actionLoading.set(true);
    this.actionError.set(null);
    try {
      await this.cycleService.openNextCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.actionError.set(err?.message ?? "Erreur lors de l'ouverture du cycle.");
    } finally {
      this.actionLoading.set(false);
    }
  }

  getMemberName(uid: string): string {
    return this.ctx()?.members?.find((m: UserProfile) => m.uid === uid)?.displayName ?? uid;
  }
}

import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, map, combineLatest } from 'rxjs';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
  MatCardActions,
  MatCardSubtitle,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { FcfaPipe } from '../../../core/pipes/fcfa.pipe';
import { CotisationChecklistComponent } from './cotisation-checklist/cotisation-checklist.component';
import { BeneficiaryConfirmComponent } from './beneficiary-confirm/beneficiary-confirm.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserProfile } from '../../../core/models/user.model';

@Component({
  selector: 'app-cycle-active',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardActions,
    RouterLink,
    DatePipe,
    FcfaPipe,
    CotisationChecklistComponent,
    BeneficiaryConfirmComponent,
  ],
  templateUrl: './cycle-active.component.html',
  styleUrl: './cycle-active.component.scss',
})
export class CycleActiveComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private dialog = inject(MatDialog);

  markingUid = signal<string | null>(null);
  actionLoading = signal(false);
  actionError = signal<string | null>(null);

  private context$ = from(this.auth.getClaims()).pipe(
    switchMap((claims) => {
      if (!claims?.deptId) return of(null);
      const deptId = claims.deptId;
      const uid = this.auth.currentUser?.uid;
      return combineLatest([
        this.saisonService.watchActiveSaison(deptId),
        this.userService.watchAllMembers(deptId),
        uid
          ? this.userService.watchProfile(deptId, uid)
          : of(undefined),
      ]).pipe(
        switchMap(([saison, members, myProfile]) => {
          if (!saison) {
            return of({ deptId, saison: null, cycleData: null, members, myProfile });
          }
          return this.cycleService
            .watchCurrentCycle(deptId, saison.id, saison.currentCycleIndex)
            .pipe(map((cycleData) => ({ deptId, saison, cycleData, members, myProfile })));
        }),
      );
    }),
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

  confirmForceClose(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Forcer la clôture du cycle',
        message: "Êtes-vous sûr ? Les membres n'ayant pas payé seront pénalisés.",
        confirmLabel: 'Forcer la clôture',
        confirmColor: 'error',
      } satisfies ConfirmDialogData,
      width: '420px',
    }).afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (confirmed) this.onForceClose();
    });
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
    return (
      this.ctx()?.members?.find((m: UserProfile) => m.uid === uid)?.displayName ?? uid
    );
  }
}

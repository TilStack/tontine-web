import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
  MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
} from '@angular/material/table';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { CycleService } from '../../../core/services/cycle.service';
import { CaisseService } from '../../../core/services/caisse.service';
import { CotisationsListCardComponent } from '../shared/cotisations-list-card/cotisations-list-card.component';
import { CaisseSummaryCardComponent } from '../shared/caisse-summary-card/caisse-summary-card.component';
import { BeneficiaireCardComponent } from '../shared/beneficiaire-card/beneficiaire-card.component';
import { MonRangCardComponent } from '../shared/mon-rang-card/mon-rang-card.component';
import { HistoryCardComponent } from '../shared/history-card/history-card.component';
import { InviteDialogComponent } from '../../membres/invite-dialog/invite-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserProfile, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatButton, MatIconButton, MatIcon, MatCard, MatCardContent, MatCardActions,
    MatTooltip, MatProgressSpinner,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    CotisationsListCardComponent, CaisseSummaryCardComponent, BeneficiaireCardComponent,
    MonRangCardComponent, HistoryCardComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private cycleService = inject(CycleService);
  private caisseService = inject(CaisseService);
  private dialog = inject(MatDialog);

  readonly memberColumns = ['name', 'email', 'role', 'action'];

  markingUid = signal<string | null>(null);
  cycleLoading = signal(false);
  cycleError = signal<string | null>(null);
  roleUpdatingUid = signal<string | null>(null);
  roleError = signal<string | null>(null);

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

  deadlinePassed = computed(() => {
    const cycle = this.ctx()?.cycleData?.cycle;
    return cycle ? cycle.deadline.toDate() < new Date() : false;
  });

  canOpenNext = computed(() => {
    const cycle = this.ctx()?.cycleData?.cycle;
    return cycle?.status === 'closed';
  });

  confirmForceClose(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Forcer la clôture du cycle',
        message: "Êtes-vous sûr de vouloir forcer la clôture ? Les membres n'ayant pas payé seront pénalisés.",
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
    if (!ctx?.saison || !ctx.cycleData) return;
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

  async onForceClose(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.cycleLoading.set(true);
    this.cycleError.set(null);
    try {
      await this.cycleService.forceCloseCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.cycleError.set(err?.message ?? 'Erreur lors de la clôture.');
    } finally {
      this.cycleLoading.set(false);
    }
  }

  async onOpenNext(): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.saison || !ctx.cycleData) return;
    this.cycleLoading.set(true);
    this.cycleError.set(null);
    try {
      await this.cycleService.openNextCycle({
        saisonId: ctx.saison.id,
        cycleId: ctx.cycleData.cycle.id,
      });
    } catch (err: any) {
      this.cycleError.set(err?.message ?? "Erreur lors de l'ouverture.");
    } finally {
      this.cycleLoading.set(false);
    }
  }

  async updateRole(member: UserProfile, newRole: UserRole): Promise<void> {
    const ctx = this.ctx();
    if (!ctx?.deptId) return;
    this.roleUpdatingUid.set(member.uid);
    this.roleError.set(null);
    try {
      await this.userService.updateUserRole({
        deptId: ctx.deptId,
        userId: member.uid,
        newRole,
      });
    } catch (err: any) {
      this.roleError.set(err?.message ?? 'Erreur lors du changement de rôle.');
    } finally {
      this.roleUpdatingUid.set(null);
    }
  }

  openInviteDialog(): void {
    const deptId = this.ctx()?.deptId;
    if (!deptId) return;
    this.dialog.open(InviteDialogComponent, {
      data: { deptId },
      width: '420px',
    });
  }
}

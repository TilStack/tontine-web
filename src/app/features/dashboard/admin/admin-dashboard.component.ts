import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { from, of, switchMap, combineLatest, map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
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
import { UserProfile, UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink, MatProgressSpinner,
    MatButton, MatCard, MatCardContent, MatCardActions, MatTooltip,
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderRowDef,
    MatCellDef, MatRowDef, MatHeaderCell, MatCell, MatHeaderRow, MatRow,
    CotisationsListCardComponent, CaisseSummaryCardComponent, BeneficiaireCardComponent,
    MonRangCardComponent, HistoryCardComponent,
  ],
  template: `
    @if (!ctx()) {
      <div style="display:flex;justify-content:center;padding:40px">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
      </div>
    } @else {
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px">

        <!-- Bloc 0 — Alerte saison -->
        @if (!ctx()!.saison) {
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;display:flex;align-items:center;justify-content:space-between">
            <span>⚠️ Aucune saison en cours — Configurez une nouvelle saison pour démarrer.</span>
            <a routerLink="/app/cycles/setup">
              <button mat-flat-button color="accent">Créer une saison</button>
            </a>
          </div>
        }

        <!-- Bloc 1 — Actions cycle -->
        @if (ctx()!.cycleData) {
          <mat-card>
            <mat-card-content>
              <h3>Cycle #{{ ctx()!.cycleData!.cycle.index }} —
                {{ ctx()!.cycleData!.cycle.status === 'open' ? 'Ouvert' : 'Clôturé' }}</h3>
              @if (cycleError()) {
                <p style="color:red">{{ cycleError() }}</p>
              }
            </mat-card-content>
            <mat-card-actions>
              @if (ctx()!.cycleData!.cycle.status === 'open') {
                @if (cycleLoading()) {
                  <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
                } @else if (deadlinePassed()) {
                  <button mat-flat-button color="warn" (click)="onForceClose()">
                    Forcer la clôture
                  </button>
                } @else {
                  <button mat-flat-button color="primary" disabled
                    matTooltip="En attente de la confirmation du bénéficiaire">
                    Clôturer le cycle
                  </button>
                }
              } @else {
                @if (cycleLoading()) {
                  <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
                } @else if (canOpenNext()) {
                  <button mat-flat-button color="primary" (click)="onOpenNext()">
                    Ouvrir le cycle suivant
                  </button>
                } @else if (ctx()!.saison?.status === 'completed') {
                  <a routerLink="/app/cycles/setup">
                    <button mat-stroked-button>Configurer une nouvelle saison</button>
                  </a>
                }
              }
            </mat-card-actions>
          </mat-card>
        }

        <!-- Bloc 2 — Membres -->
        <mat-card>
          <mat-card-content>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>Membres ({{ ctx()!.members.length }})</h3>
              <button mat-stroked-button (click)="openInviteDialog()">
                Inviter un membre
              </button>
            </div>
            @if (roleError()) {
              <p style="color:red">{{ roleError() }}</p>
            }
            <table mat-table [dataSource]="ctx()!.members" style="width:100%">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Nom</th>
                <td mat-cell *matCellDef="let m">{{ m.displayName }}</td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let m">{{ m.email }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Rôle</th>
                <td mat-cell *matCellDef="let m">{{ m.role }}</td>
              </ng-container>
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let m">
                  @if (m.role === 'membre') {
                    <button mat-stroked-button [disabled]="roleUpdatingUid() === m.uid"
                      (click)="updateRole(m, 'bureau')">
                      Promouvoir en Bureau
                    </button>
                  } @else if (m.role === 'bureau') {
                    <button mat-stroked-button [disabled]="roleUpdatingUid() === m.uid"
                      (click)="updateRole(m, 'membre')">
                      Rétrograder en Membre
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="memberColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: memberColumns"></tr>
            </table>
          </mat-card-content>
        </mat-card>

        <!-- Bloc 3 — Cotisations + Caisse (réutilise cartes Bureau) -->
        @if (ctx()!.cycleData) {
          <app-cotisations-list-card
            [cotisations]="ctx()!.cycleData!.cotisations"
            [members]="ctx()!.members"
            [cycleStatus]="ctx()!.cycleData!.cycle.status"
            [markingUid]="markingUid()"
            (markPaid)="onMarkPaid($event)">
          </app-cotisations-list-card>
        }

        <app-caisse-summary-card
          [caisse]="ctx()!.caisse"
          [transactions]="ctx()!.transactions"
          [deptId]="ctx()!.deptId">
        </app-caisse-summary-card>

        <!-- Bloc 4 — Mes infos -->
        @if (ctx()!.cycleData) {
          <app-beneficiaire-card
            [cycle]="ctx()!.cycleData!.cycle"
            [members]="ctx()!.members"
            [montantCotisation]="ctx()!.saison?.montantCotisation ?? 0">
          </app-beneficiaire-card>
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

import { Component, Input, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';
import { CycleService } from '../../../../core/services/cycle.service';

export type CtaState = 'none' | 'disabled' | 'active' | 'confirmed';

@Component({
  selector: 'app-mon-rang-card',
  standalone: true,
  imports: [
    MatCard, MatCardContent, MatCardActions,
    MatButton, MatChip, MatChipSet, MatTooltip, MatProgressSpinner,
    DecimalPipe,
  ],
  template: `
    <mat-card>
      <mat-card-content>
        <h3>Mon rang</h3>
        @if (ctaState === 'none') {
          <p>Vous êtes #{{ myRank }} dans la liste des bénéficiaires.</p>
        } @else {
          <p>Vous êtes #{{ myRank }} — <strong>bénéficiaire de ce cycle</strong></p>
          @if (ctaState === 'disabled') {
            <mat-card-actions>
              <button mat-flat-button color="primary" disabled
                [matTooltip]="'En attente de toutes les cotisations'">
                Confirmer la réception
              </button>
            </mat-card-actions>
          } @else if (ctaState === 'active') {
            @if (error()) {
              <p style="color:red">{{ error() }}</p>
            }
            <mat-card-actions>
              @if (loading()) {
                <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
              } @else {
                <button mat-flat-button color="primary" (click)="confirmReception()">
                  Confirmer la réception de {{ cycle?.montantVerse | number }} FCFA
                </button>
              }
            </mat-card-actions>
          } @else if (ctaState === 'confirmed') {
            <mat-chip-set>
              <mat-chip color="primary" highlighted>Réception confirmée ✅</mat-chip>
            </mat-chip-set>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class MonRangCardComponent {
  @Input({ required: true }) myProfile!: UserProfile;
  @Input({ required: true }) memberOrder!: string[];
  @Input({ required: true }) cycle!: Cycle | null;
  @Input({ required: true }) saisonId!: string;
  @Input({ required: true }) deptId!: string;

  private cycleService = inject(CycleService);

  loading = signal(false);
  error = signal<string | null>(null);

  get myRank(): number {
    return this.memberOrder.indexOf(this.myProfile.uid) + 1;
  }

  get isBeneficiary(): boolean {
    return this.cycle?.beneficiaryUid === this.myProfile.uid;
  }

  get ctaState(): CtaState {
    if (!this.isBeneficiary || !this.cycle) return 'none';
    if (this.cycle.confirmedAt !== null) return 'confirmed';
    if (this.cycle.status === 'closed') return 'active';
    return 'disabled';
  }

  async confirmReception(): Promise<void> {
    if (!this.cycle) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.cycleService.confirmReception({
        saisonId: this.saisonId,
        cycleId: this.cycle.id,
      });
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur lors de la confirmation.');
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, Input, inject, signal } from '@angular/core';
import { MatCard, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { FcfaPipe } from '../../../../core/pipes/fcfa.pipe';
import { Cycle } from '../../../../core/models/cycle.model';
import { UserProfile } from '../../../../core/models/user.model';
import { CycleService } from '../../../../core/services/cycle.service';

export type CtaState = 'none' | 'disabled' | 'active' | 'confirmed';

@Component({
  selector: 'app-mon-rang-card',
  standalone: true,
  imports: [MatCard, MatCardContent, MatCardActions, MatButton, MatTooltip, MatProgressSpinner, FcfaPipe],
  templateUrl: './mon-rang-card.component.html',
  styleUrl: './mon-rang-card.component.scss',
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

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatList, MatListItem } from '@angular/material/list';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SaisonService } from '../../../core/services/saison.service';
import { UserProfile } from '../../../core/models/user.model';
import { SaisonMode } from '../../../core/models/saison.model';

@Component({
  selector: 'app-saison-setup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DragDropModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    MatSelect,
    MatOption,
    MatProgressSpinner,
    MatIcon,
    MatList,
    MatListItem,
  ],
  templateUrl: './saison-setup.component.html',
})
export class SaisonSetupComponent implements OnInit {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private saisonService = inject(SaisonService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    mode: ['lottery', Validators.required],
    montantCotisation: [15000, [Validators.required, Validators.min(1)]],
  });

  loading = signal(false);
  error = signal<string | null>(null);
  deptId = signal<string | null>(null);

  seniorMembers = signal<UserProfile[]>([]);
  reorderableMembers = signal<UserProfile[]>([]);

  mode = computed(() => this.form.get('mode')?.value as SaisonMode);

  async ngOnInit(): Promise<void> {
    const claims = await this.auth.getClaims();
    if (!claims?.deptId) return;
    this.deptId.set(claims.deptId);

    this.userService.watchAllMembers(claims.deptId).subscribe((members) => {
      const sorted = [...members].sort((a, b) => {
        const aMs = a.joinedAt?.seconds ?? 0;
        const bMs = b.joinedAt?.seconds ?? 0;
        return aMs - bMs;
      });
      this.seniorMembers.set(sorted.slice(0, 2));
      this.reorderableMembers.set(sorted.slice(2));
    });
  }

  drop(event: CdkDragDrop<UserProfile[]>): void {
    const arr = [...this.reorderableMembers()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.reorderableMembers.set(arr);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.deptId()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const { mode, montantCotisation } = this.form.value as {
        mode: SaisonMode;
        montantCotisation: number;
      };

      const memberOrder = [
        ...this.seniorMembers().map((m) => m.uid),
        ...this.reorderableMembers().map((m) => m.uid),
      ];

      await this.saisonService.createSaison({
        mode,
        memberOrder,
        montantCotisation,
      });
      await this.router.navigate(['/app/cycles']);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Une erreur est survenue.');
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, inject, Inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatHint, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatButton } from '@angular/material/button';
import { CaisseService } from '../../../../core/services/caisse.service';
import { CategorieType } from '../../../../core/models/caisse.model';

export interface AddTransactionDialogData {
  deptId: string;
}

@Component({
  selector: 'app-add-transaction-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose,
    MatFormField, MatLabel, MatHint, MatError,
    MatInput,
    MatSelect, MatOption,
    MatButton,
  ],
  templateUrl: './add-transaction-dialog.component.html',
})
export class AddTransactionDialogComponent {
  private fb = inject(FormBuilder);
  private caisseService = inject(CaisseService);
  private dialogRef = inject(MatDialogRef<AddTransactionDialogComponent>);

  readonly deptId: string;

  readonly categories: { value: CategorieType; label: string }[] = [
    { value: 'nourriture', label: 'Nourriture' },
    { value: 'sortie', label: 'Sortie' },
    { value: 'evenement', label: 'Événement' },
    { value: 'materiel', label: 'Matériel' },
    { value: 'autre', label: 'Autre' },
  ];

  form = this.fb.group({
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    categorie: [null as CategorieType | null, Validators.required],
    libelle: [''],
  });

  loading = signal(false);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) data: AddTransactionDialogData) {
    this.deptId = data.deptId;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.caisseService.addTransaction({
        deptId: this.deptId,
        montant: this.form.value.montant!,
        categorie: this.form.value.categorie!,
        libelle: this.form.value.libelle ?? undefined,
      });
      this.dialogRef.close(true);
    } catch (err: any) {
      if (err?.code === 'functions/failed-precondition') {
        this.error.set('Solde insuffisant — le montant dépasse le solde disponible.');
      } else {
        this.error.set('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-request-department',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './request-department.component.html',
})
export class RequestDepartmentComponent {
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    requesterName: ['', Validators.required],
    requesterEmail: ['', [Validators.required, Validators.email]],
    deptName: ['', Validators.required],
    message: [''],
  });

  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const col = collection(this.firestore, 'department_requests');
      await addDoc(col, {
        ...this.form.value,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      this.submitted.set(true);
    } catch {
      this.error.set('Erreur lors de l\'envoi. Réessayez.');
    } finally {
      this.loading.set(false);
    }
  }
}

import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-no-department',
  standalone: true,
  imports: [MatButton, MatIcon, AuthLayoutComponent],
  templateUrl: './no-department.component.html',
  styleUrl: './no-department.component.scss',
})
export class NoDepartmentComponent {
  private auth = inject(AuthService);
  logout(): void { this.auth.logout(); }
}

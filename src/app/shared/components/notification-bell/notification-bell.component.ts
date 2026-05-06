import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { NotificationDoc } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    NotificationPanelComponent,
  ],
  templateUrl: './notification-bell.component.html',
})
export class NotificationBellComponent implements OnInit {
  @Input({ required: true }) deptId!: string;
  @Input({ required: true }) uid!: string;

  private notifService = inject(NotificationService);

  readonly notifications = signal<NotificationDoc[]>([]);
  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length
  );

  ngOnInit(): void {
    this.notifService
      .watchNotifications(this.deptId, this.uid)
      .subscribe((notifs) => this.notifications.set(notifs));
  }
}

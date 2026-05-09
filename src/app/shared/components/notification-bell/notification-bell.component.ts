import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatBadge } from '@angular/material/badge';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';
import { NotificationDoc } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    MatBadge,
    MatMenu,
    MatMenuTrigger,
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

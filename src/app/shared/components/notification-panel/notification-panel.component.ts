import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatList, MatListItem } from '@angular/material/list';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc, NotificationType } from '../../../core/models/notification.model';

const NOTIFICATION_ROUTES: Record<NotificationType, string> = {
  rappel_j5: '/app/cycles',
  paiement_enregistre: '/app/cycles',
  cagnotte_complete: '/app/cycles',
  penalite_appliquee: '/app/cycles/history',
  beneficiaire_confirme: '/app/cycles',
  cycle_ouvert: '/app/cycles',
  cycle_cloture: '/app/cycles/history',
};

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [MatList, MatListItem, MatIcon, MatButton, MatDivider, NgClass],
  templateUrl: './notification-panel.component.html',
})
export class NotificationPanelComponent {
  @Input({ required: true }) deptId!: string;
  @Input({ required: true }) uid!: string;
  @Input({ required: true }) notifications!: NotificationDoc[];

  private notifService = inject(NotificationService);
  private router = inject(Router);

  async handleClick(notif: NotificationDoc): Promise<void> {
    await this.notifService.markAsRead(this.deptId, this.uid, notif.id);
    this.router.navigate([NOTIFICATION_ROUTES[notif.type]]);
  }

  async handleMarkAll(): Promise<void> {
    const unreadIds = this.notifications
      .filter((n) => !n.read)
      .map((n) => n.id);
    await this.notifService.markAllAsRead(this.deptId, this.uid, unreadIds);
  }
}

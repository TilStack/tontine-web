import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationPanelComponent } from './notification-panel.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc } from '../../../core/models/notification.model';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeNotif = (id: string, type: NotificationDoc['type'], read = false): NotificationDoc => ({
  id,
  type,
  title: 'T',
  body: 'B',
  read,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
});

describe('NotificationPanelComponent', () => {
  let component: NotificationPanelComponent;
  let fixture: ComponentFixture<NotificationPanelComponent>;
  let notifServiceMock: jest.Mocked<
    Pick<NotificationService, 'markAsRead' | 'markAllAsRead'>
  >;
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    notifServiceMock = {
      markAsRead: jest.fn().mockResolvedValue(undefined),
      markAllAsRead: jest.fn().mockResolvedValue(undefined),
    };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [NotificationPanelComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notifServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPanelComponent);
    component = fixture.componentInstance;
    component.deptId = 'dept-1';
    component.uid = 'uid-1';
    component.notifications = [];
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('handleClick() should markAsRead and navigate to /app/cycles for rappel_j5', async () => {
    const notif = makeNotif('n1', 'rappel_j5');
    await component.handleClick(notif);
    expect(notifServiceMock.markAsRead).toHaveBeenCalledWith('dept-1', 'uid-1', 'n1');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/cycles']);
  });

  it('handleClick() should navigate to /app/cycles/history for penalite_appliquee', async () => {
    const notif = makeNotif('n2', 'penalite_appliquee');
    await component.handleClick(notif);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/cycles/history']);
  });

  it('handleMarkAll() should call markAllAsRead with unread notification ids', async () => {
    component.notifications = [
      makeNotif('n1', 'rappel_j5', false),
      makeNotif('n2', 'paiement_enregistre', true),
      makeNotif('n3', 'cagnotte_complete', false),
    ];
    await component.handleMarkAll();
    expect(notifServiceMock.markAllAsRead).toHaveBeenCalledWith(
      'dept-1',
      'uid-1',
      ['n1', 'n3']
    );
  });
});

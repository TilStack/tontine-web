import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDoc } from '../../../core/models/notification.model';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

const makeNotif = (id: string, read: boolean): NotificationDoc => ({
  id,
  type: 'rappel_j5',
  title: 'T',
  body: 'B',
  read,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
});

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let notifServiceMock: jest.Mocked<Pick<NotificationService, 'watchNotifications'>>;

  beforeEach(async () => {
    notifServiceMock = {
      watchNotifications: jest.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: notifServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    component.deptId = 'dept-1';
    component.uid = 'uid-1';
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('unreadCount should be 0 when all notifications are read', () => {
    component.notifications.set([makeNotif('n1', true), makeNotif('n2', true)]);
    expect(component.unreadCount()).toBe(0);
  });

  it('unreadCount should count only unread notifications', () => {
    component.notifications.set([
      makeNotif('n1', false),
      makeNotif('n2', true),
      makeNotif('n3', false),
    ]);
    expect(component.unreadCount()).toBe(2);
  });
});

import { TestBed } from '@angular/core/testing';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  collectionData,
  doc,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { of } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationDoc } from '../models/notification.model';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  collectionData: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
}));

const mockNotif: NotificationDoc = {
  id: 'notif-1',
  type: 'rappel_j5',
  title: 'Rappel',
  body: 'Vous avez 5 jours',
  read: false,
  createdAt: { seconds: 1000, nanoseconds: 0 } as any,
  expiresAt: { seconds: 9999, nanoseconds: 0 } as any,
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchNotifications() should return observable of notifications', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (orderBy as jest.Mock).mockReturnValue('orderByClause');
    (limit as jest.Mock).mockReturnValue('limitClause');
    (collectionData as jest.Mock).mockReturnValue(of([mockNotif]));

    service.watchNotifications('dept-1', 'uid-1').subscribe((notifs) => {
      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('rappel_j5');
      done();
    });
  });

  it('markAsRead() should call updateDoc with { read: true }', async () => {
    (doc as jest.Mock).mockReturnValue('docRef');
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    await service.markAsRead('dept-1', 'uid-1', 'notif-1');

    expect(doc).toHaveBeenCalledWith(
      expect.anything(),
      'departments/dept-1/users/uid-1/notifications/notif-1'
    );
    expect(updateDoc).toHaveBeenCalledWith('docRef', { read: true });
  });

  it('markAllAsRead() should use a single batch for multiple notifIds', async () => {
    const mockUpdate = jest.fn();
    const mockCommit = jest.fn().mockResolvedValue(undefined);
    (writeBatch as jest.Mock).mockReturnValue({ update: mockUpdate, commit: mockCommit });
    (doc as jest.Mock).mockReturnValue('docRef');

    await service.markAllAsRead('dept-1', 'uid-1', ['notif-1', 'notif-2']);

    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith('docRef', { read: true });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it('markAllAsRead() should resolve immediately when notifIds is empty', async () => {
    await expect(service.markAllAsRead('dept-1', 'uid-1', [])).resolves.toBeUndefined();
    expect(writeBatch).not.toHaveBeenCalled();
  });
});

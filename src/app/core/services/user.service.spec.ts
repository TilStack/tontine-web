import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { UserService } from './user.service';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  doc: jest.fn(),
  docData: jest.fn(),
  collection: jest.fn(),
  collectionData: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('@angular/fire/functions', () => ({
  ...jest.requireActual('@angular/fire/functions'),
  httpsCallable: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const mockCallable = jest.fn().mockResolvedValue({ data: undefined });

  beforeEach(() => {
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);
    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    service = TestBed.inject(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendInvitation()', () => {
    it('calls sendInvitation CF with correct payload', async () => {
      await service.sendInvitation({ deptId: 'd1', email: 'a@b.com', role: 'membre' });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'sendInvitation');
      expect(mockCallable).toHaveBeenCalledWith({ deptId: 'd1', email: 'a@b.com', role: 'membre' });
    });
  });

  describe('updateUserRole()', () => {
    it('calls updateUserRole CF with correct payload', async () => {
      await service.updateUserRole({ deptId: 'd1', userId: 'u1', newRole: 'bureau' });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateUserRole');
      expect(mockCallable).toHaveBeenCalledWith({ deptId: 'd1', userId: 'u1', newRole: 'bureau' });
    });
  });
});

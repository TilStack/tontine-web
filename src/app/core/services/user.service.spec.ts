import { TestBed } from '@angular/core/testing';
import { Firestore, doc, docData, collection, collectionData } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { UserService } from './user.service';
import { UserProfile } from '../models/user.model';

const mockProfile: UserProfile = {
  uid: 'user-1',
  displayName: 'Israel T.',
  email: 'israel@example.com',
  role: 'membre',
  rang: 3,
  hasBenefited: false,
  joinedAt: { seconds: 0, nanoseconds: 0 } as any,
  mustResetPassword: false,
};

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  doc: jest.fn(),
  docData: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  collectionData: jest.fn(),
}));

describe('UserService', () => {
  let service: UserService;
  const mockFirestore = {} as Firestore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, { provide: Firestore, useValue: mockFirestore }],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchProfile() should return an observable of UserProfile', (done) => {
    (doc as jest.Mock).mockReturnValue('ref');
    (docData as jest.Mock).mockReturnValue(of(mockProfile));

    service.watchProfile('dept-1', 'user-1').subscribe((profile) => {
      expect(profile?.displayName).toBe('Israel T.');
      done();
    });
  });

  it('watchAllMembers() should return an observable of UserProfile[]', (done) => {
    const mockProfiles = [mockProfile, { ...mockProfile, uid: 'user-2', displayName: 'Alice' }];

    (collection as jest.Mock).mockReturnValue('colRef');
    (collectionData as jest.Mock).mockReturnValue(of(mockProfiles));

    service.watchAllMembers('dept-1').subscribe((profiles) => {
      expect(profiles).toHaveLength(2);
      expect(profiles[0].displayName).toBe('Israel T.');
      done();
    });
  });
});

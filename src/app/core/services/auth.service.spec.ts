import { TestBed } from '@angular/core/testing';
import { Auth, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
  getIdTokenResult: jest.fn().mockResolvedValue({
    claims: { deptId: 'dept-1', role: undefined },
  }),
} as unknown as User;

const mockAuth = {
  currentUser: mockUser,
  onAuthStateChanged: jest.fn(),
} as unknown as Auth;

jest.mock('@angular/fire/auth', () => ({
  ...jest.requireActual('@angular/fire/auth'),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  authState: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Auth, useValue: mockAuth }],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login() should call signInWithEmailAndPassword', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
    await service.login('test@example.com', 'password123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth, 'test@example.com', 'password123'
    );
  });

  it('logout() should call signOut', async () => {
    (signOut as jest.Mock).mockResolvedValue(undefined);
    await service.logout();
    expect(signOut).toHaveBeenCalledWith(mockAuth);
  });

  it('getClaims() should return token claims', async () => {
    const claims = await service.getClaims();
    expect(claims?.deptId).toBe('dept-1');
  });
});

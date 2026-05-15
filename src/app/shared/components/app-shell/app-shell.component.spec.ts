import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserProfile } from '../../../core/models/user.model';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let authMock: jest.Mocked<Pick<AuthService, 'getClaims' | 'user$' | 'currentUser' | 'logout'>>;
  let userMock: jest.Mocked<Pick<UserService, 'watchProfile'>>;

  beforeEach(async () => {
    authMock = {
      getClaims: jest.fn().mockResolvedValue(null),
      user$: of(null) as any,
      currentUser: null,
      logout: jest.fn(),
    };
    userMock = { watchProfile: jest.fn().mockReturnValue(of(null)) };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: UserService, useValue: userMock },
        { provide: NotificationService, useValue: { watchNotifications: jest.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('visibleNavItems() returns [] when profile is null', () => {
    expect(component.visibleNavItems()).toHaveLength(0);
  });

  it('visibleNavItems() returns 7 items for admin role', () => {
    component.profile.set({ role: 'admin' } as UserProfile);
    expect(component.visibleNavItems()).toHaveLength(7);
  });

  it('visibleNavItems() filters correctly for membre role', () => {
    component.profile.set({ role: 'membre' } as UserProfile);
    const items = component.visibleNavItems();
    expect(items.every(i => i.roles.includes('membre'))).toBe(true);
    expect(items.length).toBe(3);
  });

  it('logout() delegates to authService.logout()', () => {
    component.logout();
    expect(authMock.logout).toHaveBeenCalled();
  });
});

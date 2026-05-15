import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthLayoutComponent } from './auth-layout.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [AuthLayoutComponent],
  template: `<app-auth-layout><p class="test-child">contenu</p></app-auth-layout>`,
})
class HostComponent {}

describe('AuthLayoutComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('se monte correctement', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('projette le contenu enfant via ng-content', () => {
    const child = fixture.nativeElement.querySelector('.test-child');
    expect(child).toBeTruthy();
    expect(child.textContent).toBe('contenu');
  });
});

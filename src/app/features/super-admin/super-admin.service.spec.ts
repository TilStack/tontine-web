import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SuperAdminService } from './super-admin.service';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let firestoreMock: any;
  let functionsMock: any;

  beforeEach(() => {
    firestoreMock = {};
    functionsMock = {};

    TestBed.configureTestingModule({
      providers: [
        SuperAdminService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: Functions, useValue: functionsMock },
      ],
    });
    service = TestBed.inject(SuperAdminService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

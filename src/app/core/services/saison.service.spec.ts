import { TestBed } from '@angular/core/testing';
import { Firestore, collection, query, where, limit, collectionData } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { of } from 'rxjs';
import { SaisonService } from './saison.service';
import { Saison } from '../models/saison.model';

const mockSaison: Saison = {
  id: 'saison-1',
  status: 'active',
  mode: 'lottery',
  montantCotisation: 15000,
  memberOrder: ['uid1', 'uid2'],
  totalCycles: 2,
  currentCycleIndex: 0,
  completedAt: null,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
  createdBy: 'uid-admin',
};

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  collectionData: jest.fn(),
}));

jest.mock('@angular/fire/functions', () => ({
  ...jest.requireActual('@angular/fire/functions'),
  httpsCallable: jest.fn(),
}));

describe('SaisonService', () => {
  let service: SaisonService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SaisonService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    service = TestBed.inject(SaisonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchActiveSaison() should return the active saison', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (limit as jest.Mock).mockReturnValue('l');
    (collectionData as jest.Mock).mockReturnValue(of([mockSaison]));

    service.watchActiveSaison('dept-1').subscribe((saison) => {
      expect(saison?.id).toBe('saison-1');
      done();
    });
  });

  it('watchActiveSaison() should return undefined when no active saison', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (limit as jest.Mock).mockReturnValue('l');
    (collectionData as jest.Mock).mockReturnValue(of([]));

    service.watchActiveSaison('dept-1').subscribe((saison) => {
      expect(saison).toBeUndefined();
      done();
    });
  });
});

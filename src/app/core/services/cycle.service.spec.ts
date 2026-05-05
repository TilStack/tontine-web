import { TestBed } from '@angular/core/testing';
import { Firestore, collection, query, where, limit, collectionData } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { of } from 'rxjs';
import { CycleService } from './cycle.service';
import { Cycle, Cotisation } from '../models/cycle.model';

const mockCycle: Cycle = {
  id: 'cycle-1',
  index: 1,
  beneficiaryUid: 'uid1',
  deadline: { seconds: 9999999, nanoseconds: 0 } as any,
  status: 'open',
  closedAt: null,
  closedBy: null,
  totalPaid: 0,
  montantVerse: 0,
  montantCaisse: 0,
  confirmedAt: null,
  confirmedBy: null,
  createdAt: { seconds: 0, nanoseconds: 0 } as any,
};

const mockCotisations: Cotisation[] = [
  { uid: 'uid1', paid: false, paidAt: null, recordedBy: null, penalized: false, penaltyAppliedAt: null },
  { uid: 'uid2', paid: true, paidAt: { seconds: 1000, nanoseconds: 0 } as any, recordedBy: 'admin', penalized: false, penaltyAppliedAt: null },
];

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  collectionData: jest.fn(),
}));

jest.mock('@angular/fire/functions', () => ({
  ...jest.requireActual('@angular/fire/functions'),
  httpsCallable: jest.fn(),
}));

describe('CycleService', () => {
  let service: CycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CycleService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    service = TestBed.inject(CycleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchCurrentCycle() should return cycle + cotisations when found', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (limit as jest.Mock).mockReturnValue('l');
    (collectionData as jest.Mock)
      .mockReturnValueOnce(of([mockCycle]))
      .mockReturnValueOnce(of(mockCotisations));

    service.watchCurrentCycle('dept-1', 'saison-1', 0).subscribe((data) => {
      expect(data?.cycle.id).toBe('cycle-1');
      expect(data?.cotisations).toHaveLength(2);
      done();
    });
  });

  it('watchCurrentCycle() should return null when no cycle found', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (where as jest.Mock).mockReturnValue('w');
    (limit as jest.Mock).mockReturnValue('l');
    (collectionData as jest.Mock).mockReturnValueOnce(of([]));

    service.watchCurrentCycle('dept-1', 'saison-1', 0).subscribe((data) => {
      expect(data).toBeNull();
      done();
    });
  });
});

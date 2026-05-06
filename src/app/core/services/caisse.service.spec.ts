import { TestBed } from '@angular/core/testing';
import {
  Firestore,
  doc,
  docData,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { of } from 'rxjs';
import { CaisseService } from './caisse.service';
import { CaisseDoc, TransactionDoc } from '../models/caisse.model';

jest.mock('@angular/fire/firestore', () => ({
  ...jest.requireActual('@angular/fire/firestore'),
  doc: jest.fn(),
  docData: jest.fn(),
  collection: jest.fn(),
  collectionData: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

jest.mock('@angular/fire/functions', () => ({
  ...jest.requireActual('@angular/fire/functions'),
  httpsCallable: jest.fn(),
}));

const mockCaisse: CaisseDoc = {
  solde: 15000,
  totalEntrees: 15000,
  totalSorties: 0,
  updatedAt: { seconds: 1000, nanoseconds: 0 } as any,
};

const mockTx: TransactionDoc = {
  id: 'tx-1',
  montant: 5000,
  type: 'debit',
  categorie: 'nourriture',
  libelle: "Repas de fin d'année",
  source: 'manuel',
  cycleId: null,
  createdBy: 'uid-1',
  createdAt: { seconds: 1000, nanoseconds: 0 } as any,
};

describe('CaisseService', () => {
  let service: CaisseService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        CaisseService,
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
      ],
    });
    service = TestBed.inject(CaisseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('watchCaisse() should return observable of caisse doc', (done) => {
    (doc as jest.Mock).mockReturnValue('docRef');
    (docData as jest.Mock).mockReturnValue(of(mockCaisse));

    service.watchCaisse('dept-1').subscribe((caisse) => {
      expect(caisse?.solde).toBe(15000);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'departments/dept-1/caisse');
      done();
    });
  });

  it('watchTransactions() should return observable of transactions ordered by createdAt', (done) => {
    (collection as jest.Mock).mockReturnValue('colRef');
    (query as jest.Mock).mockReturnValue('q');
    (orderBy as jest.Mock).mockReturnValue('orderByClause');
    (limit as jest.Mock).mockReturnValue('limitClause');
    (collectionData as jest.Mock).mockReturnValue(of([mockTx]));

    service.watchTransactions('dept-1').subscribe((txs) => {
      expect(txs).toHaveLength(1);
      expect(txs[0].categorie).toBe('nourriture');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      done();
    });
  });

  it('addTransaction() should call httpsCallable with full payload', async () => {
    const mockFn = jest.fn().mockResolvedValue({ data: null });
    (httpsCallable as jest.Mock).mockReturnValue(mockFn);

    await service.addTransaction({
      deptId: 'dept-1',
      montant: 5000,
      categorie: 'nourriture',
      libelle: 'Repas',
    });

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'addTransaction');
    expect(mockFn).toHaveBeenCalledWith({
      deptId: 'dept-1',
      montant: 5000,
      categorie: 'nourriture',
      libelle: 'Repas',
    });
  });

  it('addTransaction() should propagate errors from httpsCallable', async () => {
    const err = { code: 'functions/failed-precondition', message: 'Solde insuffisant.' };
    const mockFn = jest.fn().mockRejectedValue(err);
    (httpsCallable as jest.Mock).mockReturnValue(mockFn);

    await expect(
      service.addTransaction({ deptId: 'dept-1', montant: 99999, categorie: 'autre' })
    ).rejects.toEqual(err);
  });
});

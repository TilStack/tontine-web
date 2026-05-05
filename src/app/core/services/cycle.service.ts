import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
  orderBy,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Cycle, Cotisation, ActiveCycleData } from '../models/cycle.model';

@Injectable({ providedIn: 'root' })
export class CycleService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchCurrentCycle(
    deptId: string,
    saisonId: string,
    currentCycleIndex: number
  ): Observable<ActiveCycleData | null> {
    const targetIndex = currentCycleIndex + 1;
    const q = query(
      collection(this.firestore, `departments/${deptId}/saisons/${saisonId}/cycles`),
      where('index', '==', targetIndex),
      limit(1)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Cycle[]>).pipe(
      switchMap((cycles) => {
        if (!cycles.length) return of(null);
        const cycle = cycles[0];
        const cotisationsRef = collection(
          this.firestore,
          `departments/${deptId}/saisons/${saisonId}/cycles/${cycle.id}/cotisations`
        );
        return (collectionData(cotisationsRef, { idField: 'uid' }) as Observable<Cotisation[]>).pipe(
          map((cotisations) => ({ cycle, cotisations }))
        );
      })
    );
  }

  watchClosedCycles(deptId: string, saisonId: string): Observable<Cycle[]> {
    const q = query(
      collection(this.firestore, `departments/${deptId}/saisons/${saisonId}/cycles`),
      where('status', '==', 'closed'),
      orderBy('index', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Cycle[]>;
  }

  markCotisationPaid(payload: {
    saisonId: string;
    cycleId: string;
    userId: string;
  }): Promise<void> {
    const fn = httpsCallable(this.functions, 'markCotisationPaid');
    return fn(payload).then(() => undefined);
  }

  forceCloseCycle(payload: { saisonId: string; cycleId: string }): Promise<void> {
    const fn = httpsCallable(this.functions, 'forceCloseCycle');
    return fn(payload).then(() => undefined);
  }

  openNextCycle(payload: { saisonId: string; cycleId: string }): Promise<void> {
    const fn = httpsCallable(this.functions, 'openNextCycle');
    return fn(payload).then(() => undefined);
  }

  confirmReception(payload: { saisonId: string; cycleId: string }): Promise<void> {
    const fn = httpsCallable(this.functions, 'confirmReception');
    return fn(payload).then(() => undefined);
  }
}

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
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Cycle, Cotisation, ActiveCycleData } from '../models/cycle.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CycleService {
  private firestore = inject(Firestore);
  private api = inject(ApiService);

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
    return firstValueFrom(this.api.post('/cycle/mark-cotisation-paid', payload));
  }

  forceCloseCycle(payload: { saisonId: string; cycleId: string }): Promise<void> {
    return firstValueFrom(this.api.post('/cycle/force-close', payload));
  }

  openNextCycle(payload: { saisonId: string; cycleId: string }): Promise<void> {
    return firstValueFrom(this.api.post('/saison/open-next-cycle', payload));
  }

  confirmReception(payload: { saisonId: string; cycleId: string }): Promise<void> {
    return firstValueFrom(this.api.post('/cycle/confirm-reception', payload));
  }
}

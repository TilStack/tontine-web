import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Saison, SaisonMode } from '../models/saison.model';
import { ApiService } from './api.service';

export interface CreateSaisonPayload {
  mode: SaisonMode;
  memberOrder: string[];
  montantCotisation: number;
}

@Injectable({ providedIn: 'root' })
export class SaisonService {
  private firestore = inject(Firestore);
  private api = inject(ApiService);

  watchActiveSaison(deptId: string): Observable<Saison | undefined> {
    const q = query(
      collection(this.firestore, `departments/${deptId}/saisons`),
      where('status', '==', 'active'),
      limit(1)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Saison[]>).pipe(
      map((saisons) => saisons[0])
    );
  }

  createSaison(payload: CreateSaisonPayload): Promise<{ saisonId: string; cycleId: string }> {
    return firstValueFrom(
      this.api.post<{ saisonId: string; cycleId: string }>('/saison/create', payload)
    );
  }
}

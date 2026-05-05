import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Saison, SaisonMode } from '../models/saison.model';

export interface CreateSaisonPayload {
  mode: SaisonMode;
  memberOrder: string[];
  montantCotisation: number;
}

@Injectable({ providedIn: 'root' })
export class SaisonService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

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
    const fn = httpsCallable<CreateSaisonPayload, { saisonId: string; cycleId: string }>(
      this.functions,
      'createSaison'
    );
    return fn(payload).then((r) => r.data);
  }
}

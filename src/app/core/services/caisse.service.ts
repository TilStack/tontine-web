import { Injectable, inject } from '@angular/core';
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
import { Observable } from 'rxjs';
import { CaisseDoc, TransactionDoc, AddTransactionPayload } from '../models/caisse.model';

@Injectable({ providedIn: 'root' })
export class CaisseService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchCaisse(deptId: string): Observable<CaisseDoc | undefined> {
    const ref = doc(this.firestore, `departments/${deptId}/caisse`);
    return docData(ref) as Observable<CaisseDoc | undefined>;
  }

  watchTransactions(deptId: string): Observable<TransactionDoc[]> {
    const ref = collection(this.firestore, `departments/${deptId}/transactions`);
    const q = query(ref, orderBy('createdAt', 'desc'), limit(100));
    return collectionData(q, { idField: 'id' }) as Observable<TransactionDoc[]>;
  }

  addTransaction(payload: AddTransactionPayload): Promise<void> {
    const fn = httpsCallable(this.functions, 'addTransaction');
    return fn(payload).then(() => undefined);
  }
}

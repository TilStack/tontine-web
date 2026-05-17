import { Injectable, inject } from '@angular/core';
import {
  CollectionReference,
  DocumentReference,
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Department } from '../../core/models/department.model';
import { DepartmentRequest } from '../../core/models/department-request.model';
import { Saison } from '../../core/models/saison.model';
import { UserProfile } from '../../core/models/user.model';

export interface DeptDetail {
  dept: Department;
  saison: Saison | null;
  currentBeneficiaryUid: string | null;
  members: UserProfile[];
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private firestore = inject(Firestore);
  private functions = inject(Functions);

  watchDepartments(): Observable<Department[]> {
    return collectionData<Department>(
      collection(this.firestore, 'departments') as CollectionReference<Department>,
      { idField: 'id' }
    );
  }

  watchPendingRequests(): Observable<DepartmentRequest[]> {
    return collectionData<DepartmentRequest>(
      query(
        collection(this.firestore, 'department_requests') as CollectionReference<DepartmentRequest>,
        where('status', '==', 'pending')
      ),
      { idField: 'id' }
    );
  }

  watchDeptDetail(deptId: string): Observable<DeptDetail | null> {
    const dept$ = docData<Department>(
      doc(this.firestore, `departments/${deptId}`) as DocumentReference<Department>,
      { idField: 'id' }
    );

    const saison$ = collectionData<Saison>(
      query(
        collection(this.firestore, `departments/${deptId}/saisons`) as CollectionReference<Saison>,
        where('status', '==', 'active'),
        limit(1)
      ),
      { idField: 'id' }
    ).pipe(map((s) => s[0] ?? null));

    const members$ = collectionData<UserProfile>(
      collection(this.firestore, `departments/${deptId}/users`) as CollectionReference<UserProfile>,
      { idField: 'uid' }
    );

    return combineLatest([dept$, saison$, members$]).pipe(
      switchMap(([dept, saison, members]) => {
        if (!dept) return of(null);
        if (!saison) {
          return of({ dept, saison: null, currentBeneficiaryUid: null, members });
        }
        const openCycle$ = collectionData<{ id: string }>(
          query(
            collection(
              this.firestore,
              `departments/${deptId}/saisons/${saison.id}/cycles`
            ) as CollectionReference<{ id: string }>,
            where('status', '==', 'open'),
            limit(1)
          ),
          { idField: 'id' }
        ).pipe(
          map((cycles) =>
            cycles.length ? (saison.memberOrder[saison.currentCycleIndex] ?? null) : null
          )
        );
        return openCycle$.pipe(
          map((currentBeneficiaryUid) => ({ dept, saison, currentBeneficiaryUid, members }))
        );
      })
    );
  }

  approveRequest(requestId: string): Promise<void> {
    return httpsCallable(this.functions, 'provisionDepartment')({ requestId }).then(
      () => undefined
    );
  }

  rejectRequest(requestId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'rejectDepartmentRequest')({ requestId, reason }).then(
      () => undefined
    );
  }

  forceCloseSaison(deptId: string, saisonId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'forceSaisonClose')({ deptId, saisonId, reason }).then(
      () => undefined
    );
  }

  excludeMember(deptId: string, userId: string, reason: string): Promise<void> {
    return httpsCallable(this.functions, 'excludeMember')({ deptId, userId, reason }).then(
      () => undefined
    );
  }
}

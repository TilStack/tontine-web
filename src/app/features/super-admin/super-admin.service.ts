import { Injectable, inject } from '@angular/core';
import {
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
    return collectionData(
      collection(this.firestore, 'departments'),
      { idField: 'id' }
    ) as Observable<Department[]>;
  }

  watchPendingRequests(): Observable<DepartmentRequest[]> {
    return collectionData(
      query(
        collection(this.firestore, 'department_requests'),
        where('status', '==', 'pending')
      ),
      { idField: 'id' }
    ) as Observable<DepartmentRequest[]>;
  }

  watchDeptDetail(deptId: string): Observable<DeptDetail | null> {
    const dept$ = docData(
      doc(this.firestore, `departments/${deptId}`),
      { idField: 'id' }
    ) as Observable<Department | undefined>;

    const saison$ = (collectionData(
      query(
        collection(this.firestore, `departments/${deptId}/saisons`),
        where('status', '==', 'active'),
        limit(1)
      ),
      { idField: 'id' }
    ) as Observable<Saison[]>).pipe(map((s) => s[0] ?? null));

    const members$ = collectionData(
      collection(this.firestore, `departments/${deptId}/users`),
      { idField: 'uid' }
    ) as Observable<UserProfile[]>;

    return combineLatest([dept$, saison$, members$]).pipe(
      switchMap(([dept, saison, members]) => {
        if (!dept) return of(null);
        if (!saison) {
          return of({ dept, saison: null, currentBeneficiaryUid: null, members });
        }
        const openCycle$ = (collectionData(
          query(
            collection(
              this.firestore,
              `departments/${deptId}/saisons/${saison.id}/cycles`
            ),
            where('status', '==', 'open'),
            limit(1)
          ),
          { idField: 'id' }
        ) as Observable<Array<{ id: string }>>).pipe(
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

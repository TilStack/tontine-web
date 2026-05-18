import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { Observable, from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  post<T = void>(endpoint: string, body: unknown): Observable<T> {
    const token$ = from(this.auth.currentUser?.getIdToken() ?? Promise.resolve(''));
    return token$.pipe(
      switchMap((token) =>
        this.http.post<T>(`${environment.apiUrl}${endpoint}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
  }

  postPublic<T = void>(endpoint: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${environment.apiUrl}${endpoint}`, body);
  }
}

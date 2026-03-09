import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

const STUB_ERROR = 'Endpoint não encontrado no backend.';

/** Item de permissão (quando o backend expuser catálogo). */
export interface PermissaoItem {
  id?: string;
  name?: string | null;
  value?: string | null;
  type?: string | null;
}

/**
 * Service para Permissões (Claims/Permission).
 * Não existe nenhum endpoint relacionado a Permissões no Swagger.
 * buscar() é stub; quando existir GET, retornar array e a UI agrupa por módulo.
 * @see https://gtsbackend.azurewebsites.net/swagger/v1/swagger.json
 */
@Injectable({
  providedIn: 'root'
})
export class AcessosPermissoesService {
  /** Stub: não existe endpoint de listagem de permissões no Swagger. */
  buscar(): Observable<unknown> {
    return throwError(() => new Error(STUB_ERROR)) as Observable<unknown>;
  }

  /** Stub: não existe endpoint ObterPorId de permissão no Swagger. */
  obterPorId(_id: string): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: não existe endpoint Gravar de permissão no Swagger. */
  gravar(_dto: unknown): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: não existe endpoint Alterar de permissão no Swagger. */
  alterar(_dto: unknown): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }

  /** Stub: não existe endpoint Delete de permissão no Swagger. */
  delete(_id: string): Observable<never> {
    return throwError(() => new Error(STUB_ERROR));
  }
}

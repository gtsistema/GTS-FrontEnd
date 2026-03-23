import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, defer, from, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenuAdminService } from './menu-admin.service';
import {
  computeNextIdFromMenus,
  mapBuscarResponseToMenuAdmins,
  menuAdminToCreateInput,
  menuAdminToUpdateInput,
} from './menu-api.mapper';
import type { MenuCreateInput, MenuFilterInput, MenuUpdateInput } from './menu-api.types';

const AUTH_MENU = `${environment.API_BASE_URL}/auth/Menu`;

/**
 * Integração com os endpoints Menu do backend (Swagger).
 * Buscar, POST Gravar, PUT Alterar, DELETE Delete/{id}
 *
 * @see https://gtsbackend.azurewebsites.net/swagger/index.html
 */
@Injectable({
  providedIn: 'root',
})
export class MenuApiService {
  private readonly http = inject(HttpClient);
  private readonly menuAdmin = inject(MenuAdminService);

  /**
   * Lista menus no servidor (MenuFilterInput).
   * 1) POST com JSON — costuma evitar 415 em IIS quando GET+query não aceita `Content-Type`.
   * 2) GET com body — conforme Swagger.
   */
  buscar(filter: MenuFilterInput = {}): Observable<unknown> {
    const body = {
      numeroPagina: filter.numeroPagina ?? 1,
      tamanhoPagina: filter.tamanhoPagina ?? 500,
      descricao: filter.descricao ?? null,
      dataInicial: filter.dataInicial ?? null,
      dataFinal: filter.dataFinal ?? null,
      propriedade: filter.propriedade ?? null,
      sort: filter.sort ?? null,
    };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<unknown>(`${AUTH_MENU}/Buscar`, body, { headers }).pipe(
      timeout(60000),
      catchError(() =>
        this.http
          .request<unknown>('GET', `${AUTH_MENU}/Buscar`, {
            body,
            headers,
          })
          .pipe(timeout(60000))
      )
    );
  }

  gravar(dto: MenuCreateInput): Observable<unknown> {
    return this.http.post<unknown>(`${AUTH_MENU}/Gravar`, dto).pipe(timeout(60000));
  }

  alterar(dto: MenuUpdateInput): Observable<unknown> {
    return this.http.put<unknown>(`${AUTH_MENU}/Alterar`, dto).pipe(timeout(60000));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${AUTH_MENU}/Delete/${id}`).pipe(timeout(60000));
  }

  /**
   * Persiste o estado do Admin: primeiro **Alterar** / **Gravar** (e depois **Delete** de órfãos),
   * e só então **Buscar** para alinhar ids locais com o servidor.
   */
  salvarAlteracoesNoBackend(): Observable<void> {
    return defer(() => from(this.syncMenusToBackend()));
  }

  private async syncMenusToBackend(): Promise<void> {
    const snap = this.menuAdmin.getSnapshot();
    const localMenus = [...snap.menus].sort((a, b) => a.ordem - b.ordem);

    for (const menu of localMenus) {
      if (menu.existeNoServidor === true) {
        await firstValueFrom(this.alterar(menuAdminToUpdateInput(menu)));
      } else {
        await firstValueFrom(this.gravar(menuAdminToCreateInput(menu)));
      }
    }

    let raw = await firstValueFrom(this.buscar());
    const serverIds = new Set(
      mapBuscarResponseToMenuAdmins(raw)
        .map((m) => m.id)
        .filter((id) => id > 0)
    );
    const localIds = new Set(localMenus.map((m) => m.id));

    for (const id of serverIds) {
      if (!localIds.has(id)) {
        try {
          await firstValueFrom(this.delete(id));
        } catch (err: unknown) {
          const status = err instanceof HttpErrorResponse ? err.status : (err as { status?: number })?.status;
          if (status !== 404) throw err;
        }
      }
    }

    raw = await firstValueFrom(this.buscar());
    const menus = mapBuscarResponseToMenuAdmins(raw);
    const nextId = computeNextIdFromMenus(menus);
    this.menuAdmin.replaceMenusHidratar(menus, nextId);
  }
}

import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, from, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { MenuAdminService } from './menu-admin.service';
import type { MenuAdminState } from '../models/menu-admin.model';
import { computeNextIdFromMenus, mapBuscarResponseToMenuAdmins } from './menu-api.mapper';
import type {
  MenuCreateInput,
  MenuFilterInput,
  MenuUpdateInput,
  OrganizarMenusInput,
} from './menu-api.types';

const AUTH_MENU = `${environment.API_BASE_URL}/auth/Menu`;

/**
 * Integração com os endpoints Menu do backend (Swagger).
 * GET Buscar, POST Gravar, PUT Alterar, DELETE Delete/{id}
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
   * Lista menus no servidor. O backend expõe **GET** em `/auth/Menu/Buscar` (POST retorna 405).
   * Filtros opcionais via query string (binding ASP.NET costuma ser case-insensitive).
   */
  buscar(filter: MenuFilterInput = {}): Observable<unknown> {
    let params = new HttpParams()
      .set('numeroPagina', String(filter.numeroPagina ?? 1))
      .set('tamanhoPagina', String(filter.tamanhoPagina ?? 500));
    if (filter.descricao != null && String(filter.descricao).trim() !== '') {
      params = params.set('descricao', String(filter.descricao));
    }
    if (filter.dataInicial) params = params.set('dataInicial', filter.dataInicial);
    if (filter.dataFinal) params = params.set('dataFinal', filter.dataFinal);
    if (filter.propriedade) params = params.set('propriedade', filter.propriedade);
    if (filter.sort) params = params.set('sort', filter.sort);
    return this.http.get<unknown>(`${AUTH_MENU}/Buscar`, { params }).pipe(timeout(60000));
  }

  /**
   * POST /auth/Menu/Gravar — cria módulo (menu) no servidor.
   * Se a API retornar erro EF ("entity type 'Module' was not found"), o DbContext
   * da API precisa registrar a entidade `Module`; não é corrigível só no front.
   */
  gravar(dto: MenuCreateInput): Observable<unknown> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<unknown>(`${AUTH_MENU}/Gravar`, dto, { headers }).pipe(timeout(60000));
  }

  alterar(dto: MenuUpdateInput): Observable<unknown> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<unknown>(`${AUTH_MENU}/Alterar`, dto, { headers }).pipe(timeout(60000));
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${AUTH_MENU}/Delete/${id}`).pipe(timeout(60000));
  }

  /** DELETE /api/auth/Menu/DeleteSubMenu/{idSubMenu} */
  deleteSubMenu(idSubMenu: number): Observable<unknown> {
    return this.http
      .delete<unknown>(`${AUTH_MENU}/DeleteSubMenu/${idSubMenu}`)
      .pipe(timeout(60000));
  }

  /** DELETE /api/auth/Menu/DeletePermissao/{idPermissao} */
  deletePermissao(idPermissao: number): Observable<unknown> {
    return this.http
      .delete<unknown>(`${AUTH_MENU}/DeletePermissao/${idPermissao}`)
      .pipe(timeout(60000));
  }

  /**
   * PUT /api/auth/Menu/OrganizarMenus — persiste **apenas** a ordem dos menus e submenus no servidor.
   * Itens com `id` local 0 (ainda não gravados no backend) são ignorados no payload.
   * Em seguida executa **Buscar** para alinhar o estado local.
   */
  salvarAlteracoesNoBackend(): Observable<void> {
    return defer(() => from(this.organizarOrdemNoBackend()));
  }

  organizarMenus(payload: OrganizarMenusInput): Observable<unknown> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<unknown>(`${AUTH_MENU}/OrganizarMenus`, payload, { headers }).pipe(timeout(60000));
  }

  private buildOrganizarMenusPayload(snap: MenuAdminState): OrganizarMenusInput {
    const menusSorted = [...snap.menus].sort((a, b) => a.ordem - b.ordem);
    const menus: OrganizarMenusInput['menus'] = [];
    for (const m of menusSorted) {
      if (m.id <= 0) continue;
      const subMenus = [...m.subMenus]
        .filter((s) => s.id > 0)
        .sort((a, b) => a.ordem - b.ordem)
        .map((s) => ({ id: s.id, ordem: s.ordem }));
      menus.push({ id: m.id, ordem: m.ordem, subMenus });
    }
    return { menus };
  }

  private async organizarOrdemNoBackend(): Promise<void> {
    const snap = this.menuAdmin.getSnapshot();
    const payload = this.buildOrganizarMenusPayload(snap);
    if (payload.menus.length === 0) {
      throw new Error(
        'Nenhum menu com id do servidor para organizar. Sincronize com Buscar ou crie menus antes.'
      );
    }
    await firstValueFrom(this.organizarMenus(payload));
    const raw = await firstValueFrom(this.buscar());
    const menus = mapBuscarResponseToMenuAdmins(raw);
    const nextId = computeNextIdFromMenus(menus);
    this.menuAdmin.replaceMenusHidratar(menus, nextId);
  }
}

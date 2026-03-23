import { Injectable } from '@angular/core';
import { Observable, of, catchError, map } from 'rxjs';
import { AcessosUsuariosService, UsuarioListItem } from '../../cadastro/services/acessos-usuarios.service';
import { AcessosPerfisService, ApplicationRole } from '../../cadastro/services/acessos-perfis.service';
import {
  UsuarioGerenciamentoItem,
  GerenciamentoFiltros,
  TipoVinculo
} from '../models/gerenciamento.types';

/**
 * Service central para a tela de Gerenciamento.
 * Reutiliza AcessosUsuariosService e AcessosPerfisService.
 * Quando o backend expuser listagem/filtro de usuários com vínculo, ajustar buscar().
 */
@Injectable({
  providedIn: 'root'
})
export class GerenciamentoService {
  constructor(
    private usuariosService: AcessosUsuariosService,
    private perfisService: AcessosPerfisService
  ) {}

  /**
   * Busca usuários para a listagem. Aceita filtros; termo de busca é montado a partir deles.
   * Se o backend não tiver endpoint, retorna array vazio para não quebrar a tela.
   */
  buscar(filtros: GerenciamentoFiltros): Observable<UsuarioGerenciamentoItem[]> {
    const termo = [
      filtros.nomeUsuario?.trim(),
      filtros.cnpj?.trim(),
      filtros.razaoSocial?.trim()
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    return this.usuariosService.buscar(termo || undefined).pipe(
      map((body) => this.normalizeList(body, filtros)),
      catchError(() => of([]))
    );
  }

  /** Lista perfis para selects. */
  getPerfis(): Observable<ApplicationRole[]> {
    return this.perfisService.buscar().pipe(
      map((body) => this.normalizePerfis(body)),
      catchError(() => of([]))
    );
  }

  /** Gravar novo usuário. Delega ao AcessosUsuariosService (Register/Gravar quando existir). */
  gravar(dto: unknown): Observable<unknown> {
    return this.usuariosService.gravar(dto);
  }

  /** Alterar usuário existente. */
  alterar(dto: unknown): Observable<unknown> {
    return this.usuariosService.alterar(dto);
  }

  /** Ativar/inativar usuário. Quando o backend expuser, implementar PATCH/PUT. */
  ativarInativar(_id: string, _ativo: boolean): Observable<unknown> {
    return of(null);
  }

  /** Redefinir senha. Quando o backend expuser, implementar. */
  redefinirSenha(_id: string): Observable<unknown> {
    return of(null);
  }

  private normalizeList(
    body: unknown,
    filtros: GerenciamentoFiltros
  ): UsuarioGerenciamentoItem[] {
    const raw = this.normalizeListRaw(body);
    return raw.map((item) => this.toGerenciamentoItem(item)).filter((item) => {
      if (filtros.tipo && item.tipo !== filtros.tipo) return false;
      if (filtros.perfilId && (item as { perfilId?: string }).perfilId !== filtros.perfilId)
        return false;
      if (filtros.status === 'ativo' && !item.ativo) return false;
      if (filtros.status === 'inativo' && item.ativo) return false;
      return true;
    });
  }

  private normalizeListRaw(body: unknown): UsuarioListItem[] {
    if (Array.isArray(body)) return body as UsuarioListItem[];
    if (body && typeof body === 'object' && 'result' in body) {
      const r = (body as { result?: unknown }).result;
      return Array.isArray(r) ? (r as UsuarioListItem[]) : [];
    }
    if (body && typeof body === 'object' && 'results' in body) {
      const r = (body as { results?: unknown }).results;
      return Array.isArray(r) ? (r as UsuarioListItem[]) : [];
    }
    return [];
  }

  private toGerenciamentoItem(item: UsuarioListItem): UsuarioGerenciamentoItem {
    const ext = item as UsuarioListItem & {
      empresaVinculada?: string;
      tipo?: string;
      cnpj?: string;
      ultimoAcesso?: string;
      dataCriacao?: string;
      estacionamentoId?: number;
      transportadoraId?: number;
    };
    return {
      id: item.id,
      nome: item.nome ?? null,
      emailOuLogin: item.emailOuLogin ?? null,
      empresaVinculada: ext.empresaVinculada ?? null,
      tipo: (ext.tipo as TipoVinculo) ?? null,
      cnpj: ext.cnpj ?? null,
      perfil: item.perfil ?? null,
      permissoesResumo: null,
      ativo: item.ativo ?? true,
      ultimoAcesso: ext.ultimoAcesso ?? null,
      dataCriacao: ext.dataCriacao ?? null,
      estacionamentoId: ext.estacionamentoId ?? null,
      transportadoraId: ext.transportadoraId ?? null
    };
  }

  private normalizePerfis(body: unknown): ApplicationRole[] {
    if (Array.isArray(body)) return body as ApplicationRole[];
    if (body && typeof body === 'object' && 'result' in body) {
      const r = (body as { result?: unknown }).result;
      return Array.isArray(r) ? (r as ApplicationRole[]) : [];
    }
    if (body && typeof body === 'object' && 'results' in body) {
      const r = (body as { results?: unknown }).results;
      return Array.isArray(r) ? (r as ApplicationRole[]) : [];
    }
    return [];
  }
}

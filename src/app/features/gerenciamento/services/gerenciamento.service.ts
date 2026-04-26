import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AcessosUsuariosService, UsuarioListItem } from '../../cadastro/services/acessos-usuarios.service';
import { AcessosPerfisService, ApplicationRole } from '../../cadastro/services/acessos-perfis.service';
import { UsuarioGerenciamentoItem, GerenciamentoFiltros } from '../models/gerenciamento.types';
import type { UsuarioDetalheOutput } from '../../../core/api/types/usuario-api.types';

/**
 * Orquestra listagem, CRUD e perfis da tela de Acessos (Gerenciamento).
 */
@Injectable({
  providedIn: 'root'
})
export class GerenciamentoService {
  constructor(
    private usuariosService: AcessosUsuariosService,
    private perfisService: AcessosPerfisService
  ) {}

  /** GET /api/auth/Usuario + filtros em memória. */
  buscar(filtros: GerenciamentoFiltros): Observable<UsuarioGerenciamentoItem[]> {
    return this.usuariosService.buscar().pipe(
      map((body) => this.normalizeList(body, filtros))
    );
  }

  getPerfis(): Observable<ApplicationRole[]> {
    return this.perfisService.buscarSimplicadoUsuario().pipe(
      map((body) => this.normalizePerfis(body)),
      catchError(() => of([]))
    );
  }

  obterDetalhe(id: string): Observable<UsuarioDetalheOutput & { nome?: string; emailOuLogin?: string; cpfCnpj?: string }> {
    return this.usuariosService.obterPorId(id) as Observable<
      UsuarioDetalheOutput & { nome?: string; emailOuLogin?: string; cpfCnpj?: string }
    >;
  }

  gravar(dto: unknown): Observable<unknown> {
    return this.usuariosService.gravar(dto);
  }

  alterar(dto: unknown): Observable<unknown> {
    return this.usuariosService.alterar(dto);
  }

  excluir(id: string): Observable<unknown> {
    return this.usuariosService.delete(id);
  }

  private normalizeList(
    body: unknown,
    filtros: GerenciamentoFiltros
  ): UsuarioGerenciamentoItem[] {
    const raw = this.normalizeListRaw(body);
    return raw
      .map((item) => this.toGerenciamentoItem(item))
      .filter((item) => this.passaFiltros(item, filtros));
  }

  private passaFiltros(
    item: UsuarioGerenciamentoItem,
    filtros: GerenciamentoFiltros
  ): boolean {
    const termo = (filtros.nomeOuEmail ?? '').trim().toLowerCase();
    if (termo) {
      const partes = [item.nome, item.userName, item.email, item.emailOuLogin].filter(
        (s): s is string => typeof s === 'string' && s.trim() !== ''
      );
      const ok = partes.some((p) => p.toLowerCase().includes(termo));
      if (!ok) {
        return false;
      }
    }
    const pn = (filtros.perfilNome ?? '').trim().toLowerCase();
    if (pn) {
      const role = (item.perfil ?? '').trim().toLowerCase();
      if (!role) {
        return false;
      }
      if (role !== pn && !role.includes(pn)) {
        return false;
      }
    }
    return true;
  }

  private normalizeListRaw(body: unknown): UsuarioListItem[] {
    if (Array.isArray(body)) {
      return body as UsuarioListItem[];
    }
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
    return {
      id: item.id,
      userName: item.userName,
      nome: item.nome,
      email: item.email,
      emailOuLogin: (item.emailOuLogin ?? item.email ?? item.userName) as string,
      perfil: item.perfil ?? item.role ?? null,
      estacionamentoId: item.estacionamentoId ?? null,
      ativo: item.ativo ?? true
    };
  }

  private normalizePerfis(body: unknown): ApplicationRole[] {
    if (Array.isArray(body)) {
      return body as ApplicationRole[];
    }
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, timeout } from 'rxjs';

/** URL fixa da API ViaCEP (permite CORS para GET). Evita proxy que pode devolver index.html. */
const VIACEP_URL = 'https://viacep.com.br/ws';

/** Resposta da API ViaCEP (GET /ws/{cep}/json/) */
export interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/** Dados de endereço preenchidos para o formulário (logradouro, bairro, cidade, estado) */
export interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class ViacepService {
  constructor(private http: HttpClient) {}

  /**
   * Busca endereço pelo CEP na API ViaCEP.
   * @param cep CEP com ou sem máscara (apenas 8 dígitos são usados)
   * @returns Observable com logradouro, bairro, cidade, estado ou null se não encontrado/erro
   */
  buscarPorCep(cep: string): Observable<EnderecoViaCep | null> {
    const apenasDigitos = (cep ?? '').replace(/\D/g, '');
    if (apenasDigitos.length !== 8) {
      return of(null);
    }
    return this.http.get<ViaCepResponse>(`${VIACEP_URL}/${apenasDigitos}/json/`).pipe(
      timeout(10000),
      map((res) => {
        if (res?.erro || !res) return null;
        return {
          logradouro: res.logradouro ?? '',
          bairro: res.bairro ?? '',
          cidade: res.localidade ?? '',
          estado: res.uf ?? ''
        };
      }),
      catchError(() => of(null))
    );
  }
}

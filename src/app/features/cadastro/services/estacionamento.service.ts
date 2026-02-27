import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  EstacionamentoDTO,
  EstacionamentoListItemDTO
} from '../models/estacionamento.dto';

const API_BASE = 'https://gtsbackend.azurewebsites.net/api';
const ESTACIONAMENTO = `${API_BASE}/Estacionamento`;

@Injectable({
  providedIn: 'root'
})
export class EstacionamentoService {
  constructor(private http: HttpClient) {}

  /** POST /api/Estacionamento/Gravar */
  gravar(dto: EstacionamentoDTO): Observable<EstacionamentoDTO | null> {
    return this.http
      .post<EstacionamentoDTO>(`${ESTACIONAMENTO}/Gravar`, dto)
      .pipe(catchError(() => of(null)));
  }

  /** GET /api/Estacionamento - listagem (confirmar endpoint no backend) */
  listar(): Observable<EstacionamentoListItemDTO[]> {
    return this.http
      .get<EstacionamentoListItemDTO[]>(ESTACIONAMENTO)
      .pipe(catchError(() => of([])));
  }

  /** GET /api/Estacionamento/:id - obter por id para edição */
  obterPorId(id: number): Observable<EstacionamentoDTO | null> {
    return this.http
      .get<EstacionamentoDTO>(`${ESTACIONAMENTO}/${id}`)
      .pipe(catchError(() => of(null)));
  }
}

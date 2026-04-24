import { ApplicationRef, Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastLevel = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  message: string;
  level?: ToastLevel;
}

/**
 * Serviço para exibir toasts (snackbar). O ErrorInterceptor emite aqui.
 * Emite no NgZone e força um tick para a UI atualizar na hora (evita toast só aparecer ao clicar).
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toasts = new Subject<ToastMessage>();

  /** Observable de mensagens para quem quiser exibir o toast na UI. */
  readonly messages$ = this.toasts.asObservable();

  constructor(
    private ngZone: NgZone,
    private appRef: ApplicationRef
  ) {}

  show(message: string, level: ToastLevel = 'info'): void {
    this.ngZone.run(() => {
      this.toasts.next({ message, level });
      this.appRef.tick();
    });
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }
}

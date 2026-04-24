import { ChangeDetectorRef, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { ToastService, type ToastMessage, type ToastLevel } from '../../../core/api/services/toast.service';

const DISMISS_MS = 4500;

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  private sub: Subscription | null = null;
  private timerSub: Subscription | null = null;

  message: ToastMessage | null = null;
  visible = false;

  ngOnInit(): void {
    this.sub = this.toastService.messages$.subscribe((msg) => {
      this.message = msg;
      this.visible = true;
      this.timerSub?.unsubscribe();
      this.timerSub = timer(DISMISS_MS).subscribe(() => {
        this.visible = false;
        this.message = null;
        this.cdr.markForCheck();
      });
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  close(): void {
    this.timerSub?.unsubscribe();
    this.visible = false;
    this.message = null;
  }

  get levelClass(): string {
    return this.message?.level ? `toast--${this.message.level}` : '';
  }

  get icon(): string {
    const level = this.message?.level ?? 'info';
    const icons: Record<ToastLevel, string> = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[level];
  }
}

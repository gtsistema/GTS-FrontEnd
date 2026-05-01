import { ChangeDetectorRef, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/api/services/toast.service';
import { ThemeService, ThemeMode } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent {
  private themeService = inject(ThemeService);
  private destroyRef = inject(DestroyRef);

  readonly form: FormGroup;
  loading = false;

  private themeMode = signal<ThemeMode>('dark');
  readonly currentMode = computed(() => this.themeMode());

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.themeMode.set(this.themeService.getCurrentTheme().mode);
    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((t) => this.themeMode.set(t.mode));
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  toggleTheme(): void {
    const next = this.themeMode() === 'dark' ? 'light' : 'dark';
    this.themeService.setThemeMode(next);
  }

  get username() {
    return this.form.get('username');
  }

  get password() {
    return this.form.get('password');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.value;
    this.loading = true;

    this.authService.login(username, password).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (result) => {
        if (result.success) {
          this.toast.success('Login realizado com sucesso.');
          this.router.navigateByUrl(this.authService.getDefaultAuthorizedRoute());
        } else {
          this.toast.error(result.message);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.toast.error('Erro ao conectar. Tente novamente.');
        this.cdr.detectChanges();
      }
    });
  }
}



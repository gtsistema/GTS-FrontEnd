import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { ToastService } from '../../../core/api/services/toast.service';
import { PermissionCacheService } from '../../../core/services/permission-cache.service';
import { EntradaSaidaService } from './entrada-saida.service';
import { EntradaSaidaFormComponent } from './entrada-saida-form.component';

describe('EntradaSaidaFormComponent', () => {
  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };
  const routeCreateMock = {
    snapshot: { paramMap: { get: (_k: string) => null } },
    parent: {}
  };

  const entradaSaidaServiceMock = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  };

  const toastMock = { success: vi.fn(), error: vi.fn() };
  const permissionMock = {
    has: (k: string) => k === 'entradasaida.gravar' || k === 'entradasaida.alterar',
    hasAny: () => false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntradaSaidaFormComponent],
      providers: [
        { provide: EntradaSaidaService, useValue: entradaSaidaServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: PermissionCacheService, useValue: permissionMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeCreateMock }
      ]
    }).compileComponents();
  });

  it('deve atualizar texto ao digitar e limpar motoristaId até nova seleção no modal', () => {
    const fixture = TestBed.createComponent(EntradaSaidaFormComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.form.patchValue({ motoristaId: 99 });
    cmp.motoristaTexto = 'José';

    const input = document.createElement('input');
    input.value = 'Jo';
    cmp.onMotoristaCampoInput({ target: input } as unknown as Event);

    expect(cmp.motoristaTexto).toBe('Jo');
    expect(cmp.form.controls.motoristaId.value).toBeNull();
  });
});

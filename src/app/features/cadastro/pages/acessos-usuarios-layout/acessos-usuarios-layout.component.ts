import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AcessosUsuariosToolbarService } from '../../services/acessos-usuarios-toolbar.service';

@Component({
  selector: 'app-acessos-usuarios-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: './acessos-usuarios-layout.component.html',
  styleUrls: ['./acessos-usuarios-layout.component.scss'],
})
export class AcessosUsuariosLayoutComponent {
  readonly toolbar = inject(AcessosUsuariosToolbarService);

  onBuscar(): void {
    this.toolbar.triggerSearch();
  }
}

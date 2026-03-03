import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EstacionamentoToolbarService } from './services/estacionamento-toolbar.service';

@Component({
  selector: 'app-estacionamento-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, FormsModule],
  templateUrl: './estacionamento-layout.component.html',
  styleUrls: ['./estacionamento-layout.component.scss']
})
export class EstacionamentoLayoutComponent {
  readonly toolbar = inject(EstacionamentoToolbarService);
  activeTab: 'estacionamentos' | 'usuarios' = 'estacionamentos';

  onBuscar(): void {
    this.toolbar.triggerSearch();
  }
}

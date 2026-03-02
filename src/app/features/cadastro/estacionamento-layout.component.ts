import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-estacionamento-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './estacionamento-layout.component.html',
  styleUrls: ['./estacionamento-layout.component.scss']
})
export class EstacionamentoLayoutComponent {
  activeTab: 'estacionamentos' | 'usuarios' = 'estacionamentos';
}

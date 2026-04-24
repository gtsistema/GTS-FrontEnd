import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-configuracoes-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './configuracoes-layout.component.html',
  styleUrls: ['./configuracoes-layout.component.scss'],
})
export class ConfiguracoesLayoutComponent {}

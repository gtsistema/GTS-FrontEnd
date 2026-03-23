import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-gerenciamento-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './gerenciamento-layout.component.html',
  styleUrls: ['./gerenciamento-layout.component.scss'],
})
export class GerenciamentoLayoutComponent {}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-cadastro-acessos-page',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './cadastro-acessos-page.component.html',
  styleUrls: ['./cadastro-acessos-page.component.scss']
})
export class CadastroAcessosPageComponent {}

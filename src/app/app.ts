import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('GTS-FrontEnd');

  constructor(private themeService: ThemeService) {
    // Aplica o tema ao carregar (incluindo na tela de login)
  }
}

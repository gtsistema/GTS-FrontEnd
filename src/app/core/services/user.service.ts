import { Injectable } from '@angular/core';

export interface AppUser {
  username: string;
  password: string;
  nome?: string;
  perfil: 'Admin' | 'Operador' | 'Leitura';
  permissoes: {
    acessoConfiguracoes: boolean;
    verHome: boolean;
  };
}

export interface LoggedUser {
  username: string;
  perfil: string;
  permissoes: {
    acessoConfiguracoes: boolean;
    verHome: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor() {}

  /**
   * Obtém todos os usuários salvos no localStorage
   */
  getAllUsers(): AppUser[] {
    const data = localStorage.getItem('app_users');
    return data ? JSON.parse(data) : [];
  }

  /**
   * Cria um novo usuário
   */
  createUser(user: AppUser): boolean {
    const users = this.getAllUsers();

    // Validar se usuário já existe
    if (users.some(u => u.username === user.username)) {
      return false;
    }

    users.push(user);
    localStorage.setItem('app_users', JSON.stringify(users));
    return true;
  }

  /**
   * Obtém um usuário pelo username
   */
  getUserByUsername(username: string): AppUser | undefined {
    return this.getAllUsers().find(u => u.username === username);
  }

  /**
   * Atualiza permissões de um usuário
   */
  updateUserPermissions(username: string, permissoes: any): boolean {
    const users = this.getAllUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return false;
    }

    users[userIndex].permissoes = permissoes;
    localStorage.setItem('app_users', JSON.stringify(users));
    return true;
  }

  /**
   * Deleta um usuário
   */
  deleteUser(username: string): boolean {
    const users = this.getAllUsers().filter(u => u.username !== username);
    localStorage.setItem('app_users', JSON.stringify(users));
    return true;
  }
}

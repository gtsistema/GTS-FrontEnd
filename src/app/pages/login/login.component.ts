import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  readonly form: FormGroup;
  loginError: string | null = null;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get username() {
    return this.form.get('username');
  }

  get password() {
    return this.form.get('password');
  }

  onSubmit(): void {
    if (this.form.valid) {
      console.log(this.form.value);
      const { username, password } = this.form.value;
      // simple client-side check for provided credentials
      if (username === 'admin' && password === 'admin') {
        this.loginError = null;
        this.router.navigate(['/home']);
        return;
      }
      this.loginError = 'Usuário ou senha incorretos.';
    } else {
      this.form.markAllAsTouched();
    }
  }
}

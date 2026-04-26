/**
 * Item de listagem — alinhar ao JSON real do `GET /api/auth/Usuario`.
 * @see environment + `/swagger/v1/swagger.json` (paths `/api/auth/Usuario`, `/api/auth/Usuario/{id}`).
 */
export interface UsuarioOutput {
  /** Swagger: `Usuario/{id}` usa int32; a listagem costuma repetir o mesmo tipo. */
  id?: string | number;
  userName?: string | null;
  email?: string | null;
  nome?: string | null;
  estacionamentoId?: number | null;
  /** Nome do perfil/role. */
  role?: string | null;
}

export interface PessoaUsuarioOutput {
  id?: number;
  nome?: string | null;
  documento?: string | null;
  /** 1 = Física, 2 = Jurídica. */
  tipoPessoa?: number;
}

export interface PerfilRoleOutput {
  id?: string;
  name?: string | null;
  normalizedName?: string | null;
  concurrencyStamp?: string | null;
}

/** GET api/auth/Usuario/{id} */
export interface UsuarioDetalheOutput {
  id?: string;
  userName?: string | null;
  email?: string | null;
  estacionamentoId?: number;
  pessoa?: PessoaUsuarioOutput | null;
  perfil?: PerfilRoleOutput | null;
}

/**
 * POST Register / PUT {id} — corpo (RegisterInput).
 * Senha opcional no PUT; se preencher, confirmPassword deve coincidir.
 */
export interface RegisterInput {
  userName: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  estacionamentoId: number;
  pessoa: {
    id: number;
    nome: string;
    documento: string;
    tipoPessoa: number;
  };
  perfil: {
    name: string;
  };
}

/** Resposta de POST Register (quando a API retorna detalhe do fluxo de e-mail). */
export interface RegistroResult {
  mensagem?: string;
  message?: string;
  email?: string;
  linkConfirmacaoNoFrontend?: string;
  linkConfirmacaoNoFrontend1?: string;
  emailDeConfirmacaoEnviado?: boolean;
  EmailDeConfirmacaoEnviado?: boolean;
}

export interface ConfirmarEmailRequest {
  userId: number;
  token: string;
}

export interface LoginEnvelopeBody {
  success?: boolean;
  Success?: boolean;
  result?: unknown;
  Result?: unknown;
  message?: string;
  Message?: string;
  notifications?: string[] | string;
}

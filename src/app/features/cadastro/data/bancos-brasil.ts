/**
 * Lista de bancos brasileiros (instituições financeiras).
 * Apenas bancos; não inclui meios de pagamento (PayPal, PagSeguro, Mercado Pago, etc.).
 * Ordenação alfabética por nome.
 */
export interface BancoBrasil {
  codigo: string;
  nome: string;
}

export const BANCOS_BRASIL: BancoBrasil[] = [
  { codigo: '246', nome: 'Banco ABC Brasil' },
  { codigo: '025', nome: 'Banco Alfa' },
  { codigo: '641', nome: 'Banco Alvorada' },
  { codigo: '213', nome: 'Banco Arbi' },
  { codigo: '096', nome: 'Banco B3' },
  { codigo: '024', nome: 'Banco BANDEPE' },
  { codigo: '318', nome: 'Banco BMG' },
  { codigo: '752', nome: 'Banco BNP Paribas Brasil' },
  { codigo: '107', nome: 'Banco BOCOM BBM' },
  { codigo: '063', nome: 'Banco Bradescard' },
  { codigo: '237', nome: 'Banco Bradesco' },
  { codigo: '218', nome: 'Banco BS2' },
  { codigo: '208', nome: 'Banco BTG Pactual' },
  { codigo: '336', nome: 'Banco C6' },
  { codigo: '473', nome: 'Banco Caixa Geral Brasil' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '755', nome: 'Banco Citibank' },
  { codigo: '721', nome: 'Banco Credibel' },
  { codigo: '222', nome: 'Banco Credit Agricole Brasil' },
  { codigo: '505', nome: 'Banco Credit Suisse Brasil' },
  { codigo: '069', nome: 'Banco Crefisa' },
  { codigo: '266', nome: 'Banco Cédula' },
  { codigo: '739', nome: 'Banco Cetelem' },
  { codigo: '756', nome: 'Banco Cooperativo do Brasil (Sicoob)' },
  { codigo: '748', nome: 'Banco Cooperativo Sicredi' },
  { codigo: '654', nome: 'Banco Digio' },
  { codigo: '047', nome: 'Banco do Estado de Sergipe' },
  { codigo: '037', nome: 'Banco do Estado do Pará' },
  { codigo: '041', nome: 'Banco do Estado do Rio Grande do Sul (Banrisul)' },
  { codigo: '004', nome: 'Banco do Nordeste do Brasil' },
  { codigo: '001', nome: 'Banco do Brasil' },
  { codigo: '265', nome: 'Banco Fator' },
  { codigo: '224', nome: 'Banco Fibra' },
  { codigo: '094', nome: 'Banco Finaxis' },
  { codigo: '612', nome: 'Banco Guanabara' },
  { codigo: '012', nome: 'Banco Inbursa' },
  { codigo: '077', nome: 'Banco Inter' },
  { codigo: '249', nome: 'Banco Investcred Unibanco' },
  { codigo: '184', nome: 'Banco Itaú BBA' },
  { codigo: '341', nome: 'Banco Itaú Unibanco' },
  { codigo: '479', nome: 'Banco ItauBank' },
  { codigo: '389', nome: 'Banco Mercantil do Brasil' },
  { codigo: '746', nome: 'Banco Modal' },
  { codigo: '260', nome: 'Nubank' },
  { codigo: '212', nome: 'Banco Original' },
  { codigo: '623', nome: 'Banco Pan' },
  { codigo: '611', nome: 'Banco Paulista' },
  { codigo: '643', nome: 'Banco Pine' },
  { codigo: '638', nome: 'Banco Prosper' },
  { codigo: '747', nome: 'Banco Rabobank Internacional Brasil' },
  { codigo: '633', nome: 'Banco Rendimento' },
  { codigo: '741', nome: 'Banco Ribeirão Preto' },
  { codigo: '120', nome: 'Banco Rodobens' },
  { codigo: '422', nome: 'Banco Safra' },
  { codigo: '033', nome: 'Banco Santander Brasil' },
  { codigo: '743', nome: 'Banco Semear' },
  { codigo: '637', nome: 'Banco Sofisa' },
  { codigo: '464', nome: 'Banco Sumitomo Mitsui Brasil' },
  { codigo: '082', nome: 'Banco Topázio' },
  { codigo: '634', nome: 'Banco Triângulo' },
  { codigo: '655', nome: 'Banco Neon (Neon Pagamentos)' },
  { codigo: '070', nome: 'Banco de Brasília (BRB)' },
  { codigo: '136', nome: 'Unicred Cooperativa' },
  { codigo: '084', nome: 'Uniprime Norte do Paraná' }
];

/** Valor exibido no select: "código - nome" */
export function bancoToOption(b: BancoBrasil): string {
  return `${b.codigo} - ${b.nome}`;
}

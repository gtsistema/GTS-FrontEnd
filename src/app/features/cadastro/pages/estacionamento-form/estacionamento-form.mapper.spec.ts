import { describe, it, expect } from 'vitest';
import {
  formValueToEstacionamentoPayload,
  montarPayloadEstacionamento,
  buildAgencia,
  buildConta,
  type FormValue
} from './estacionamento-form.mapper';
import type { EstacionamentoPayloadMergeContext } from '../../models/estacionamento.dto';

describe('Estacionamento-form.mapper', () => {
  const baseFormValue: FormValue = {
    id: 0,
    descricao: 'Estacionamento Teste',
    pessoaId: 0,
    pessoa: {
      id: 0,
      tipoPessoa: 2,
      nomeRazaoSocial: 'Razão Social LTDA',
      nomeFantasia: 'Fantasia',
      documento: '12.345.678/0001-90',
      email: 'contato@teste.com',
      ativo: true
    },
    responsavelLegalNome: 'Alexsander Penna',
    responsavelLegalCpf: '060.064.311-57',
    contatoTelefone: '(11) 98765-4321',
    capacidadeVeiculos: 50,
    tamanho: '500',
    possuiSeguranca: true,
    possuiBanheiro: true,
    tipoTaxaMensalidade: 'taxa',
    taxaPercentual: 10,
    mensalidadeValor: null
  };

  it('deve gerar payload com todos os campos esperados pelo backend', () => {
    const payload = formValueToEstacionamentoPayload(baseFormValue);

    expect(payload).toHaveProperty('id', 0);
    expect(payload).toHaveProperty('descricao', 'Estacionamento Teste');
    expect(payload).toHaveProperty('dataCriacao');
    expect(payload).toHaveProperty('dataAtualizacao');
    expect(payload).toHaveProperty('pessoaId', 0);
    expect(payload).toHaveProperty('capacidadeVeiculo', 50);
    expect(payload).toHaveProperty('tamanhoTerreno', '500');
    expect(payload).toHaveProperty('resposanvelLegal', 'Alexsander Penna');
    expect(payload).toHaveProperty('responsavelCpf', '06006431157');
    expect(payload).toHaveProperty('possuiSeguranca', true);
    expect(payload).toHaveProperty('possuiBanheiro', true);
    expect(payload).toHaveProperty('tipoCobranca', 1);
    expect(payload).toHaveProperty('cobrancaPorcentagem', 10);
    expect(payload).toHaveProperty('cobrancaValor', 0);
    expect(payload).toHaveProperty('pessoa');
    expect(Array.isArray(payload['contaBancaria'])).toBe(true);
    expect((payload['contaBancaria'] as unknown[]).length).toBe(0);
    const pessoaRoot = payload['pessoa'] as Record<string, unknown>;
    expect(pessoaRoot['descricao']).toBe('Fantasia');
    expect(typeof pessoaRoot['dataCriacao']).toBe('string');
    expect(typeof pessoaRoot['dataAtualizacao']).toBe('string');
  });

  it('deve enviar documento da pessoa apenas com dígitos', () => {
    const payload = formValueToEstacionamentoPayload(baseFormValue);
    const pessoa = payload['pessoa'] as Record<string, unknown>;
    expect(pessoa['documento']).toBe('12345678000190');
  });

  it('deve enviar CPF do responsável apenas com dígitos', () => {
    const payload = formValueToEstacionamentoPayload(baseFormValue);
    expect(payload['responsavelCpf']).toBe('06006431157');
  });

  it('deve incluir telefone em pessoa.contatos quando preenchido', () => {
    const payload = formValueToEstacionamentoPayload(baseFormValue);
    const pessoa = payload['pessoa'] as Record<string, unknown>;
    const contatos = pessoa['contatos'] as Array<Record<string, unknown>>;
    expect(Array.isArray(contatos)).toBe(true);
    expect(contatos.length).toBe(1);
    expect(contatos[0]['pessoaId']).toBe(0);
    expect(contatos[0]['principal']).toBe(true);
    expect(contatos[0]['tipoContato']).toBe(1);
    expect(contatos[0]['numero']).toBe('11987654321');
  });

  it('deve enviar pessoa com enderecos e contatos vazios quando telefone vazio', () => {
    const value: FormValue = {
      ...baseFormValue,
      contatoTelefone: ''
    };
    const payload = formValueToEstacionamentoPayload(value);
    const pessoa = payload['pessoa'] as Record<string, unknown>;
    expect(pessoa['enderecos']).toEqual([]);
    expect(pessoa['contatos']).toEqual([]);
  });

  it('deve mapear tipoTaxaMensalidade "mensalidade" para tipoCobranca 2 e cobrancaValor', () => {
    const value: FormValue = {
      ...baseFormValue,
      tipoTaxaMensalidade: 'mensalidade',
      taxaPercentual: null,
      mensalidadeValor: 299.9
    };
    const payload = formValueToEstacionamentoPayload(value);
    expect(payload['tipoCobranca']).toBe(2);
    expect(payload['cobrancaPorcentagem']).toBe(0);
    expect(payload['cobrancaValor']).toBe(299.9);
  });

  it('deve mapear tipoTaxaMensalidade null para tipoCobranca 0', () => {
    const value: FormValue = {
      ...baseFormValue,
      tipoTaxaMensalidade: null,
      taxaPercentual: null,
      mensalidadeValor: null
    };
    const payload = formValueToEstacionamentoPayload(value);
    expect(payload['tipoCobranca']).toBe(0);
    expect(payload['cobrancaPorcentagem']).toBe(0);
    expect(payload['cobrancaValor']).toBe(0);
  });

  it('dataCriacao e dataAtualizacao devem ser ISO string', () => {
    const payload = formValueToEstacionamentoPayload(baseFormValue);
    expect(typeof payload['dataCriacao']).toBe('string');
    expect(typeof payload['dataAtualizacao']).toBe('string');
    expect(() => new Date(payload['dataCriacao'] as string)).not.toThrow();
    expect(() => new Date(payload['dataAtualizacao'] as string)).not.toThrow();
  });

  it('buildAgencia e buildConta montam número e dígito no formato esperado', () => {
    expect(buildAgencia('1216', '0')).toBe('1216-0');
    expect(buildAgencia('1216', '')).toBe('1216');
    expect(buildAgencia('', '0')).toBe('');
    expect(buildConta('12345', '6')).toBe('12345-6');
    expect(buildConta('12345', '')).toBe('12345');
  });

  it('payload envia contaBancaria com agencia/conta fracionados (Swagger ContaBancariaInput)', () => {
    const value: FormValue = {
      ...baseFormValue,
      id: 5,
      agenciaNumero: '1216',
      agenciaDigito: '0',
      contaNumero: '12345',
      contaDigito: '6'
    };
    const payload = formValueToEstacionamentoPayload(value);
    const conta = payload['contaBancaria'] as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(conta)).toBe(true);
    expect(conta?.[0]?.['agencia']).toBe('1216');
    expect(conta?.[0]?.['agenciaDigito']).toBe('0');
    expect(conta?.[0]?.['conta']).toBe('12345');
    expect(conta?.[0]?.['contaDigito']).toBe('6');
    expect(conta?.[0]?.['estacionamentoId']).toBe(5);
    expect(String(conta?.[0]?.['descricao'] ?? '').length).toBeGreaterThan(0);
    expect(typeof conta?.[0]?.['dataCriacao']).toBe('string');
    expect(typeof conta?.[0]?.['dataAtualizacao']).toBe('string');
  });

  it('montarPayloadEstacionamento com merge preserva dataCriacao do estacionamento e mescla conta da API', () => {
    const merge: EstacionamentoPayloadMergeContext = {
      estacionamentoDataCriacao: '2021-06-10T12:00:00.000Z',
      contaBancariaPreserved: {
        id: 77,
        descricao: 'Conta API',
        dataCriacao: '2021-07-01T08:00:00.000Z',
        campoExtraDaApi: 'mantido'
      },
      pessoaDescricao: 'Descr merge',
      pessoaDataCriacao: '2021-05-01T10:00:00.000Z'
    };
    const value: FormValue = {
      ...baseFormValue,
      id: 10,
      pessoaId: 20,
      agenciaNumero: '1216',
      contaNumero: '143591',
      contaDigito: '',
      banco: '001',
      tipoConta: 'corrente',
      chavePix: '06006431157'
    };
    const payload = montarPayloadEstacionamento(value, [], [], merge);
    expect(payload['dataCriacao']).toBe('2021-06-10T12:00:00.000Z');
    expect(payload['id']).toBe(10);
    expect(payload['pessoaId']).toBe(20);
    const pessoa = payload['pessoa'] as Record<string, unknown>;
    expect(pessoa['descricao']).toBe('Descr merge');
    expect(pessoa['dataCriacao']).toBe('2021-05-01T10:00:00.000Z');
    const contas = payload['contaBancaria'] as Array<Record<string, unknown>>;
    expect(contas[0]['id']).toBe(77);
    expect(contas[0]['dataCriacao']).toBe('2021-07-01T08:00:00.000Z');
    expect(contas[0]['campoExtraDaApi']).toBe('mantido');
    expect(contas[0]['estacionamentoId']).toBe(10);
  });
});

/**
 * Modelo mínimo usado apenas quando o proprietário não configurou `contractTemplateText`.
 * Use no seu .txt os placeholders entre chaves duplas, por exemplo {{LOCADOR_NOME_RAZAO}}.
 * A lista completa está em `RENTAL_CONTRACT_PLACEHOLDER_KEYS` em fillRentalContract.ts.
 */
export const rentalContractTemplate = `CONTRATO DE LOCAÇÃO DE VEÍCULO

LOCADOR
Nome/Razão Social: {{LOCADOR_NOME_RAZAO}}
CPF/CNPJ: {{LOCADOR_CPF_CNPJ}}
Endereço: {{LOCADOR_ENDERECO}}
Telefone: {{LOCADOR_TELEFONE}}
E-mail: {{LOCADOR_EMAIL}}

LOCATÁRIO
Nome: {{LOCATARIO_NOME_COMPLETO}}
CPF: {{LOCATARIO_CPF}}
CNH: {{LOCATARIO_CNH}}
Endereço: {{LOCATARIO_ENDERECO}}
Telefone: {{LOCATARIO_TELEFONE}}
E-mail: {{LOCATARIO_EMAIL}}

VEÍCULO
Marca/Modelo: {{VEICULO_MARCA_MODELO}}
Ano: {{VEICULO_ANO}}
Placa: {{VEICULO_PLACA}}
Cor: {{VEICULO_COR}}
Título: {{VEICULO_TITULO}}

VALOR E FORMA DE PAGAMENTO
Valor da locação (referência): R$ {{VALOR_LOCACAO_BRL}} por {{PERIODO_COBRANCA}}
Formas / observações: {{FORMA_PAGAMENTO}}
Caução: {{CAUCAO}}
`;

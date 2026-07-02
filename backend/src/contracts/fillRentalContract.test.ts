import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillRentalContract } from "./fillRentalContract.js";

const baseInput = {
  rental: { id: "cmr3kkjlc004znyt6uqq91x33" },
  vehicle: {
    title: "Fiat Mobi",
    plate: "ABC1D23",
    brand: "Fiat",
    model: "Mobi",
    year: 2022,
    cor: "Branco",
    paymentNotes: "Pix",
    caucao: "500",
    contractTime: "DIARIO" as const,
    dailyRateCents: 15000,
  },
  owner: {
    email: "locador@test.com",
    ownerProfile: {
      nomeRazaoSocial: "Locador LTDA",
      cpfCnpj: "12345678901",
      phone: "31999999999",
      logradouro: "Rua A",
      numero: "10",
      complemento: "",
      bairro: "Centro",
      cidade: "BH",
      uf: "MG",
      cep: "30123456",
      emailLocador: "locador@test.com",
    },
  },
  driver: {
    email: "motorista@test.com",
    driverProfile: {
      fullName: "João Silva",
      cpf: "98765432100",
      cnh: "12345678900",
      phone: "31888888888",
      logradouro: "Rua B",
      numero: "20",
      complemento: "",
      bairro: "Savassi",
      cidade: "BH",
      uf: "MG",
      cep: "30111222",
    },
  },
};

describe("fillRentalContract", () => {
  it("aplica máscara de CPF/CNPJ e valor por extenso", () => {
    const out = fillRentalContract(
      "Locador: {{LOCADOR_CPF_CNPJ}}\nLocatário: {{LOCATARIO_CPF}}\nValor: {{VALOR_LOCACAO_BRL}}\nCaução: {{CAUCAO}}",
      baseInput
    );

    assert.match(out, /123\.456\.789-01/);
    assert.match(out, /987\.654\.321-00/);
    assert.match(out, /150,00 \(cento e cinquenta reais\)/);
    assert.match(out, /R\$\s*500,00 \(quinhentos reais\)/);
  });

  it("preserva caução já mascarada e só acrescenta extenso", () => {
    const out = fillRentalContract("Caução: {{CAUCAO}}", {
      ...baseInput,
      vehicle: {
        ...baseInput.vehicle,
        caucao: "R$ 1.500,00",
      },
    });
    assert.match(out, /R\$ 1\.500,00 \(mil e quinhentos reais\)/);
  });

  it("não inclui rodapé com Rental ID", () => {
    const out = fillRentalContract("Contrato simples", baseInput);
    assert.doesNotMatch(out, /Rental ID/i);
    assert.doesNotMatch(out, /cmr3kkjlc004znyt6uqq91x33/);
  });

  it("mantém caução textual sem extenso quando não for valor", () => {
    const out = fillRentalContract("Caução: {{CAUCAO}}", {
      ...baseInput,
      vehicle: {
        ...baseInput.vehicle,
        caucao: "A combinar com o locatário",
      },
    });
    assert.match(out, /A combinar com o locatário/);
    assert.doesNotMatch(out, /\(.*reais\)/);
  });
});

describe("moneyInWordsFromCents", () => {
  it("formata centavos", async () => {
    const { moneyInWordsFromCents } = await import("../utils/moneyInWords.js");
    assert.equal(moneyInWordsFromCents(15050), "cento e cinquenta reais e cinquenta centavos");
    assert.equal(moneyInWordsFromCents(100), "um real");
  });
});

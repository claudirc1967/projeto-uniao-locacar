import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ownerProfileIssues } from "./ownerProfileIssues.js";

describe("ownerProfileIssues", () => {
  it("returns single issue when profile is null", () => {
    assert.deepEqual(ownerProfileIssues(null), ["Perfil não cadastrado"]);
  });

  it("returns empty when profile is complete", () => {
    assert.deepEqual(
      ownerProfileIssues({
        nomeRazaoSocial: "João Locações",
        emailLocador: "joao@example.com",
        contractTemplateText: "Contrato padrão",
        cpfCnpj: "12345678901",
        phone: "31999998888",
        cep: "30130000",
        logradouro: "Rua A",
        numero: "100",
        bairro: "Centro",
        cidade: "Belo Horizonte",
        uf: "MG",
      }),
      []
    );
  });

  it("flags missing contract template and empty name", () => {
    const issues = ownerProfileIssues({
      nomeRazaoSocial: "",
      emailLocador: "joao@example.com",
      contractTemplateText: null,
      cpfCnpj: "12345678901",
      phone: "31999998888",
      cep: "30130000",
      logradouro: "Rua A",
      numero: "100",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      uf: "MG",
    });
    assert.ok(issues.includes("Nome / razão social"));
    assert.ok(issues.includes("Modelo de contrato"));
  });
});

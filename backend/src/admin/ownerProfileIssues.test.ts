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

  it("does not flag missing contract template when other fields are complete", () => {
    assert.deepEqual(
      ownerProfileIssues({
        nomeRazaoSocial: "João Locações",
        emailLocador: "joao@example.com",
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

  it("flags empty name", () => {
    const issues = ownerProfileIssues({
      nomeRazaoSocial: "",
      emailLocador: "joao@example.com",
      cpfCnpj: "12345678901",
      phone: "31999998888",
      cep: "30130000",
      logradouro: "Rua A",
      numero: "100",
      bairro: "Centro",
      cidade: "Belo Horizonte",
      uf: "MG",
    });
    assert.deepEqual(issues, ["Nome / razão social"]);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDriverRentalEligibility,
  isDriverPreRegistrationComplete,
} from "../src/driverProfileEligibility.js";

const completeProfile = {
  status: "PENDING" as const,
  rejectionReason: null,
  fullName: "João Silva",
  phone: "11999998888",
  cpf: "52998224725",
  cnh: "12345678900",
  cnhCategory: "B",
  cnhValidity: "01/01/2030",
  cnhYears: 5,
  cnhHasEar: true,
  criminalAttestation: true,
  uberRegistered: false,
  cep: "01310100",
  logradouro: "Av Paulista",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "SP",
  numero: "100",
};

describe("driverProfileEligibility", () => {
  it("exige pré-cadastro completo", () => {
    assert.equal(isDriverPreRegistrationComplete(completeProfile), true);
    assert.equal(
      isDriverPreRegistrationComplete({ ...completeProfile, cnh: "" }),
      false
    );
  });

  it("permite solicitar locação com PENDING se pré-cadastro completo", () => {
    const result = getDriverRentalEligibility(completeProfile);
    assert.equal(result.ok, true);
  });

  it("bloqueia motorista reprovado", () => {
    const result = getDriverRentalEligibility({
      ...completeProfile,
      status: "REJECTED",
      rejectionReason: "Documento inválido",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /Documento inválido/);
    }
  });
});

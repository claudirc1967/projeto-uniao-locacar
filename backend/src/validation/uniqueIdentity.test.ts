import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCpfCnpjDigits,
  normalizePhoneDigits,
} from "./uniqueIdentity.js";

describe("uniqueIdentity normalization", () => {
  it("remove máscara de telefone", () => {
    assert.equal(normalizePhoneDigits("(31) 99999-8888"), "31999998888");
  });

  it("remove máscara de CPF/CNPJ", () => {
    assert.equal(normalizeCpfCnpjDigits("12.345.678/0001-90"), "12345678000190");
    assert.equal(normalizeCpfCnpjDigits("529.982.247-25"), "52998224725");
  });
});

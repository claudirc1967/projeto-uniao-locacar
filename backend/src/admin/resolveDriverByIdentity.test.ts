import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { phoneValidationMessage } from "../validation/phone.js";

/**
 * Smoke: regras usadas na busca de motorista (CPF 11 / telefone 10–11).
 * resolveDriverByIdentity depende do Prisma; coberto via integração manual.
 */
describe("admin driver search input rules", () => {
  it("rejects short phone for search", () => {
    const msg = phoneValidationMessage("319886394", { required: false });
    assert.ok(msg);
  });

  it("accepts mobile phone", () => {
    assert.equal(
      phoneValidationMessage("31999998888", { required: false }),
      null
    );
  });
});

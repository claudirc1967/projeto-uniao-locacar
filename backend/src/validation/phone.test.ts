import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidBrazilPhoneDigits,
  normalizePhoneDigits,
  phoneValidationMessage,
} from "./phone.js";

describe("phone validation", () => {
  it("normalizes masked input", () => {
    assert.equal(normalizePhoneDigits("(31) 98863-9400"), "31988639400");
  });

  it("accepts landline 10 digits", () => {
    assert.equal(isValidBrazilPhoneDigits("3134567890"), true);
    assert.equal(phoneValidationMessage("3134567890"), null);
  });

  it("accepts mobile 11 digits starting with 9 after DDD", () => {
    assert.equal(isValidBrazilPhoneDigits("31988639400"), true);
    assert.equal(phoneValidationMessage("(31) 98863-9400"), null);
  });

  it("rejects short numbers", () => {
    assert.equal(isValidBrazilPhoneDigits("319886394"), false);
    assert.match(
      phoneValidationMessage("319886394") ?? "",
      /10 dígitos|11/
    );
  });

  it("rejects 11 digits without mobile 9", () => {
    assert.equal(isValidBrazilPhoneDigits("31345678901"), false);
    assert.match(
      phoneValidationMessage("31345678901") ?? "",
      /começando com 9/
    );
  });

  it("optional empty is ok", () => {
    assert.equal(phoneValidationMessage("", { required: false }), null);
    assert.equal(phoneValidationMessage("  ", { required: false }), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { foldAccents } from "./textSearch.js";

describe("foldAccents", () => {
  it("lowercases ASCII", () => {
    assert.equal(foldAccents("Fiat"), "fiat");
  });

  it("strips Portuguese accents", () => {
    assert.equal(foldAccents("São Paulo"), "sao paulo");
    assert.equal(foldAccents("Coração"), "coracao");
  });

  it("matches folded needle to folded haystack", () => {
    assert.equal(foldAccents("FIAT"), foldAccents("fiat"));
    assert.ok(foldAccents("São José").includes(foldAccents("sao jose")));
  });
});

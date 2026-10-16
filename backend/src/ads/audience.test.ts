import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { impressionAudienceId } from "./audience.js";

const guest = "guest:0123456789abcdef0123456789abcdef";

describe("impressionAudienceId", () => {
  it("usa a conta quando a pessoa está logada", () => {
    assert.equal(impressionAudienceId("user-1", guest), "user-1");
  });

  it("usa o identificador do visitante quando não há conta", () => {
    assert.equal(
      impressionAudienceId(null, "guest:0123456789ABCDEF0123456789ABCDEF"),
      guest
    );
  });

  it("ignora um id que não é de visitante", () => {
    assert.equal(impressionAudienceId(null, "clh0user1234567890"), null);
    assert.equal(impressionAudienceId(null, "guest:curto"), null);
    assert.equal(impressionAudienceId(null, null), null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { highlightOrderRequestedAdminEmail } from "./adminNotify.js";

describe("highlightOrderRequestedAdminEmail", () => {
  it("inclui referência, plano, valor e locador", () => {
    const email = highlightOrderRequestedAdminEmail({
      ownerName: "Prime Locadora",
      ownerEmail: "prime@example.com",
      ownerPhone: "31991452262",
      vehicleTitle: "Onix 2022",
      vehiclePlate: "ABC1D23",
      tierLabel: "Ouro",
      amountCents: 4990,
      durationDays: 30,
      orderReference: "HL-ABC123",
    });

    assert.match(email.subject, /Ouro/);
    assert.match(email.text, /HL-ABC123/);
    assert.match(email.text, /Ouro/);
    assert.match(email.text, /R\$\s*49,90/);
    assert.match(email.text, /30 dia\(s\)/);
    assert.match(email.text, /Onix 2022 \(ABC1D23\)/);
    assert.match(email.text, /Prime Locadora/);
    assert.match(email.text, /prime@example.com/);
    assert.match(email.text, /Admin → Destaques/);
  });
});

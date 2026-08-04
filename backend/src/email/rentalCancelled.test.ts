import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rentalCancelledEmail } from "./templates.js";

describe("rentalCancelledEmail", () => {
  it("diferencia cancelamento pelo admin e pelo locador", () => {
    const byOwner = rentalCancelledEmail({
      driver: { name: "João" },
      owner: { name: "Maria", phone: "31999999999", email: "m@x.com" },
      vehicle: { brand: "VW", model: "Gol", plate: "ABC1D23" },
      cancellationReason: "Desistência do motorista",
      cancelledByAdmin: false,
    });
    assert.match(byOwner.subject, /cancelada/i);
    assert.match(byOwner.text, /locador cancelou/i);
    assert.match(byOwner.text, /Desistência do motorista/);

    const byAdmin = rentalCancelledEmail({
      driver: { name: "João" },
      owner: { name: "Maria", phone: null, email: null },
      vehicle: { brand: "VW", model: "Gol", plate: "ABC1D23" },
      cancellationReason: "Acordo entre as partes",
      cancelledByAdmin: true,
    });
    assert.match(byAdmin.text, /plataforma/i);
  });
});

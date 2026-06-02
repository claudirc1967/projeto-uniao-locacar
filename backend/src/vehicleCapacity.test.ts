import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { normalizeVehicleCapacity } from "./vehicleCapacity.js";

describe("normalizeVehicleCapacity", () => {
  it("zera portas e lugares para motocicleta", () => {
    assert.deepEqual(
      normalizeVehicleCapacity("MOTORCYCLE", 4, 5),
      { portas: null, lugares: null }
    );
  });

  it("exige portas e lugares para automóvel", () => {
    assert.throws(
      () => normalizeVehicleCapacity("CAR", null, 5),
      (e: unknown) => e instanceof TRPCError
    );
  });

  it("aceita capacidade válida para automóvel", () => {
    assert.deepEqual(normalizeVehicleCapacity("CAR", 4, 5), {
      portas: 4,
      lugares: 5,
    });
  });
});

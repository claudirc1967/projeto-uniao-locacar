import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseOptionalVehicleColor,
  VEHICLE_COLOR_LABELS,
} from "./vehicleColors.js";

describe("parseOptionalVehicleColor", () => {
  it("accepts canonical labels", () => {
    assert.equal(parseOptionalVehicleColor("Branco"), "Branco");
    assert.equal(parseOptionalVehicleColor("Bordô"), "Bordô");
  });

  it("treats blank as null", () => {
    assert.equal(parseOptionalVehicleColor(""), null);
    assert.equal(parseOptionalVehicleColor("  "), null);
    assert.equal(parseOptionalVehicleColor(null), null);
    assert.equal(parseOptionalVehicleColor(undefined), undefined);
  });

  it("rejects free text", () => {
    assert.throws(() => parseOptionalVehicleColor("Branca"), /Cor inválida/);
  });

  it("lists expected colors", () => {
    assert.ok(VEHICLE_COLOR_LABELS.includes("Preto"));
    assert.ok(VEHICLE_COLOR_LABELS.includes("Outra"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortVehiclesWithinTier } from "./exposure.js";
import { effectiveHighlightTier, sortVehiclesForMarketplace } from "./tier.js";

function vehicle(
  id: string,
  tier: "NORMAL" | "BRONZE" | "PRATA" | "OURO",
  updatedAt = new Date("2026-01-01")
) {
  return {
    id,
    highlightTier: tier,
    highlightExpiresAt: null as Date | null,
    updatedAt,
  };
}

describe("sortVehiclesWithinTier", () => {
  it("coloca veículo com menos exposições primeiro", () => {
    const list = [
      { id: "b" },
      { id: "a" },
      { id: "c" },
    ];
    const counts = new Map([
      ["a", 1],
      ["b", 5],
      ["c", 1],
    ]);
    const sorted = sortVehiclesWithinTier(list, counts, 0);
    assert.equal(sorted[2]?.id, "b");
    assert.deepEqual(
      sorted.slice(0, 2).map((v) => v.id).sort(),
      ["a", "c"]
    );
  });

  it("rotationSeed altera desempate entre veículos com mesma exposição", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const counts = new Map<string, number>();
    const s0 = sortVehiclesWithinTier(list, counts, 0).map((v) => v.id);
    const s1 = sortVehiclesWithinTier(list, counts, 1).map((v) => v.id);
    assert.notDeepEqual(s0, s1);
  });
});

describe("sortVehiclesForMarketplace", () => {
  it("ordena blocos OURO → PRATA → BRONZE → NORMAL", () => {
    const list = [
      vehicle("n1", "NORMAL"),
      vehicle("o1", "OURO"),
      vehicle("b1", "BRONZE"),
      vehicle("p1", "PRATA"),
    ];
    const sorted = sortVehiclesForMarketplace(list);
    assert.deepEqual(
      sorted.map((v) => v.id),
      ["o1", "p1", "b1", "n1"]
    );
  });

  it("trata destaque expirado como NORMAL", () => {
    const expired = {
      id: "e1",
      highlightTier: "OURO" as const,
      highlightExpiresAt: new Date("2020-01-01"),
      updatedAt: new Date("2026-06-01"),
    };
    const active = vehicle("o1", "OURO");
    const sorted = sortVehiclesForMarketplace([expired, active], {
      now: new Date("2026-06-08"),
    });
    assert.equal(sorted[0]?.id, "o1");
    assert.equal(sorted[1]?.id, "e1");
    assert.equal(effectiveHighlightTier(expired, new Date("2026-06-08")), "NORMAL");
  });
});

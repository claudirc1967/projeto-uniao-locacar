import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdCampaign } from "@prisma/client";
import {
  filterByImpressionCap,
  impressionCountKey,
  pickEligibleCampaign,
  pickRoundRobinFromTier,
} from "./eligibility.js";

const base = {
  status: "ACTIVE" as const,
  subtitle: null,
  imageUrl: null,
  ctaLabel: "Saiba mais",
  clickUrl: "https://example.com",
  placements: ["DRIVER_HOME" as const],
  targetRoles: ["DRIVER" as const],
  targetUfs: [],
  targetCidades: [],
  nationwide: true,
  startsAt: null,
  endsAt: null,
  sourcePartnerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function campaign(
  id: string,
  title: string,
  priority: number
): AdCampaign {
  return { ...base, id, title, priority };
}

describe("pickEligibleCampaign", () => {
  it("prefere maior prioridade", () => {
    const picked = pickEligibleCampaign(
      [campaign("a", "Low", 5), campaign("b", "High", 20)],
      {
        placement: "DRIVER_HOME",
        role: "DRIVER",
        userId: "user-1",
      }
    );
    assert.equal(picked?.id, "b");
  });

  it("alterna entre campanhas do mesmo tier com rotationSeed diferente", () => {
    const pool = [
      campaign("aaa", "One", 10),
      campaign("bbb", "Two", 10),
      campaign("ccc", "Three", 10),
    ];
    const a = pickEligibleCampaign(pool, {
      placement: "DRIVER_HOME",
      role: "DRIVER",
      userId: "user-1",
      rotationSeed: 0,
    });
    const b = pickEligibleCampaign(pool, {
      placement: "DRIVER_HOME",
      role: "DRIVER",
      userId: "user-1",
      rotationSeed: 1,
    });
    const c = pickEligibleCampaign(pool, {
      placement: "DRIVER_HOME",
      role: "DRIVER",
      userId: "user-1",
      rotationSeed: 2,
    });
    assert.notEqual(a?.id, b?.id);
    assert.notEqual(b?.id, c?.id);
    assert.notEqual(a?.id, c?.id);
  });

  it("avança no round-robin após impressões registradas", () => {
    const pool = [
      campaign("aaa", "One", 10),
      campaign("bbb", "Two", 10),
      campaign("ccc", "Three", 10),
    ];
    const counts = new Map<string, number>([
      [impressionCountKey("aaa", "DRIVER_HOME"), 1],
    ]);
    const picked = pickEligibleCampaign(pool, {
      placement: "DRIVER_HOME",
      role: "DRIVER",
      userId: "user-1",
      rotationSeed: 0,
      impressionCounts: counts,
    });
    assert.equal(picked?.id, "bbb");
  });

  it("cai para tier inferior quando tier superior atingiu cap", () => {
    const counts = new Map<string, number>([
      [impressionCountKey("high", "DRIVER_HOME"), 99],
    ]);
    const picked = pickEligibleCampaign(
      [campaign("high", "High", 20), campaign("low", "Low", 5)],
      {
        placement: "DRIVER_HOME",
        role: "DRIVER",
        userId: "user-1",
        impressionCounts: counts,
      }
    );
    assert.equal(picked?.id, "low");
  });

  it("retorna null quando todas as elegíveis atingiram cap", () => {
    const counts = new Map<string, number>([
      [impressionCountKey("only", "DRIVER_HOME"), 99],
    ]);
    const picked = pickEligibleCampaign([campaign("only", "Only", 10)], {
      placement: "DRIVER_HOME",
      role: "DRIVER",
      userId: "user-1",
      impressionCounts: counts,
    });
    assert.equal(picked, null);
  });
});

describe("pickRoundRobinFromTier", () => {
  it("distribui slots simultâneos no marketplace", () => {
    const tier = [
      campaign("aaa", "A", 1),
      campaign("bbb", "B", 1),
      campaign("ccc", "C", 1),
    ];
    const counts = new Map<string, number>();
    const picks = [0, 1, 2].map((seed) =>
      pickRoundRobinFromTier(tier, counts, "MARKETPLACE_LIST", seed)?.id
    );
    assert.deepEqual(new Set(picks), new Set(["aaa", "bbb", "ccc"]));
  });
});

describe("filterByImpressionCap", () => {
  it("respeita cap por placement", () => {
    const counts = new Map<string, number>([
      [impressionCountKey("c1", "DRIVER_HOME"), 5],
      [impressionCountKey("c1", "MARKETPLACE_LIST"), 0],
    ]);
    const filtered = filterByImpressionCap(
      [campaign("c1", "C1", 1)],
      counts,
      "DRIVER_HOME",
      5
    );
    assert.equal(filtered.length, 0);

    const filteredMarketplace = filterByImpressionCap(
      [campaign("c1", "C1", 1)],
      counts,
      "MARKETPLACE_LIST",
      5
    );
    assert.equal(filteredMarketplace.length, 1);
  });
});

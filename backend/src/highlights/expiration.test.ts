import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, reminderWindowEnd } from "./expiration.js";
import { HIGHLIGHT_EXPIRY_REMINDER_DAYS } from "./constants.js";

const DAY = 24 * 60 * 60 * 1000;

test("reminderWindowEnd soma a antecedência padrão", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");
  const end = reminderWindowEnd(now);
  assert.equal(
    end.getTime(),
    now.getTime() + HIGHLIGHT_EXPIRY_REMINDER_DAYS * DAY
  );
});

test("daysUntil arredonda para cima e nunca é negativo", () => {
  const now = new Date("2026-06-08T12:00:00.000Z");
  assert.equal(daysUntil(new Date(now.getTime() + 2.2 * DAY), now), 3);
  assert.equal(daysUntil(new Date(now.getTime() + 1 * DAY), now), 1);
  assert.equal(daysUntil(new Date(now.getTime() - 5 * DAY), now), 0);
  assert.equal(daysUntil(now, now), 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseLedgerCursor } from "./pagination.ts";

test("parses an opaque transaction cursor into a normalized timestamp and id", () => {
  assert.deepEqual(
    parseLedgerCursor({ createdAt: "2026-11-03T13:00:00.000Z", id: "entry-1" }),
    { createdAt: "2026-11-03T13:00:00.000Z", id: "entry-1" },
  );
  assert.equal(parseLedgerCursor(null), null);
});

test("rejects malformed or oversized transaction cursors", () => {
  for (const cursor of [
    "",
    [],
    {},
    { createdAt: "not-a-date", id: "entry-1" },
    { createdAt: "2026-11-03T13:00:00.000Z", id: "" },
    { createdAt: "2026-11-03T13:00:00.000Z", id: "x".repeat(129) },
  ]) {
    assert.throws(() => parseLedgerCursor(cursor), /Invalid transaction cursor/);
  }
});

import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/api-keys/rate-limit";

describe("rate limiting", () => {
  it("allows requests under limit", () => {
    const id = `test-${Date.now()}-allow`;
    const result = checkRateLimit(id);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(59);
  });

  it("blocks after 60 requests", () => {
    const id = `test-${Date.now()}-block`;
    for (let i = 0; i < 60; i++) {
      const r = checkRateLimit(id);
      expect(r.allowed).toBe(true);
    }
    const blocked = checkRateLimit(id);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("different identifiers have separate limits", () => {
    const id1 = `test-${Date.now()}-a`;
    const id2 = `test-${Date.now()}-b`;
    for (let i = 0; i < 60; i++) checkRateLimit(id1);
    expect(checkRateLimit(id1).allowed).toBe(false);
    expect(checkRateLimit(id2).allowed).toBe(true);
  });
});

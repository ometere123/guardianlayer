import { describe, it, expect } from "vitest";
import { slugify, generateKey, truncateHash, truncateAddress, formatTimeAgo } from "@/lib/utils";

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips non-alphanumeric characters", () => {
    expect(slugify("Uniswap V3 (ETH)")).toBe("uniswap-v3-eth");
  });
  it("collapses multiple hyphens", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });
});

describe("generateKey", () => {
  it("starts with the given prefix", () => {
    expect(generateKey("inc-")).toMatch(/^inc-/);
  });
  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateKey("x-")));
    expect(keys.size).toBe(50);
  });
  it("is URL-safe (no special chars)", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateKey("prot")).toMatch(/^[a-zA-Z0-9_-]+$/);
    }
  });
});

describe("truncateHash", () => {
  const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  it("truncates long hashes with ellipsis", () => {
    const result = truncateHash(hash, 8);
    expect(result).toContain("…");
    expect(result.length).toBeLessThan(hash.length);
  });
  it("always appends ellipsis (function always truncates)", () => {
    // truncateHash slices unconditionally — it's the caller's job to pass long hashes
    const result = truncateHash("short", 10);
    expect(result).toContain("…");
  });
});

describe("truncateAddress", () => {
  it("truncates with ellipsis and preserves suffix", () => {
    const addr = "0xf53A06740c8C4d8973036bdbD9b71d05A81856F0";
    const result = truncateAddress(addr);
    expect(result).toContain("…");
    expect(result.endsWith(addr.slice(-6))).toBe(true);
    expect(result.startsWith(addr.slice(0, 8))).toBe(true);
  });
});

describe("formatTimeAgo", () => {
  it("handles recent timestamps without throwing", () => {
    const now = new Date().toISOString();
    expect(() => formatTimeAgo(now)).not.toThrow();
    expect(typeof formatTimeAgo(now)).toBe("string");
  });
  it("returns a string for old dates", () => {
    expect(typeof formatTimeAgo("2020-01-01T00:00:00.000Z")).toBe("string");
  });
});

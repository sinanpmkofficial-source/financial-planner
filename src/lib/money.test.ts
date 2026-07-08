import { describe, it, expect } from "vitest";
import { toPaise, toRupees } from "./money";

describe("toPaise", () => {
  it("converts whole rupees to paise", () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(0)).toBe(0);
  });

  it("converts fractional rupees exactly", () => {
    expect(toPaise(99.99)).toBe(9999);
    expect(toPaise(0.01)).toBe(1);
    expect(toPaise(1234.5)).toBe(123450);
  });

  it("rounds to the nearest paise (no fractional minor units)", () => {
    expect(toPaise(0.005)).toBe(1); // rounds up
    expect(toPaise(0.004)).toBe(0); // rounds down
  });

  it("handles negative amounts", () => {
    expect(toPaise(-50.5)).toBe(-5050);
  });

  it("returns 0 for non-finite input", () => {
    expect(toPaise(NaN)).toBe(0);
    expect(toPaise(Infinity)).toBe(0);
  });
});

describe("toRupees", () => {
  it("converts paise back to rupees", () => {
    expect(toRupees(10000)).toBe(100);
    expect(toRupees(9999)).toBe(99.99);
    expect(toRupees(1)).toBe(0.01);
  });

  it("returns 0 for non-finite input", () => {
    expect(toRupees(NaN)).toBe(0);
  });
});

describe("round-trip", () => {
  it("preserves 2-decimal rupee values through paise", () => {
    for (const rupees of [0, 1, 99.99, 1000.5, 123456.78, 0.01]) {
      expect(toRupees(toPaise(rupees))).toBeCloseTo(rupees, 2);
    }
  });

  it("avoids float drift when summing minor units", () => {
    // 0.1 + 0.2 in rupees drifts; in paise it is exact.
    const sum = toPaise(0.1) + toPaise(0.2);
    expect(sum).toBe(30);
    expect(toRupees(sum)).toBe(0.3);
  });
});

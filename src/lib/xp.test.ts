import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  getXpForNextLevel,
  getXpForCurrentLevel,
  getXpProgress,
} from "./xp";

describe("calculateLevel", () => {
  it("starts at level 1 with no XP", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
  });

  it("advances at each threshold", () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(250)).toBe(3);
    expect(calculateLevel(500)).toBe(4);
    expect(calculateLevel(1000)).toBe(5);
  });

  it("caps at the highest level", () => {
    expect(calculateLevel(10000)).toBe(10);
    expect(calculateLevel(999_999)).toBe(10);
  });
});

describe("getXpForCurrentLevel / getXpForNextLevel", () => {
  it("returns the correct thresholds", () => {
    expect(getXpForCurrentLevel(1)).toBe(0);
    expect(getXpForCurrentLevel(3)).toBe(250);
    expect(getXpForNextLevel(1)).toBe(100);
    expect(getXpForNextLevel(2)).toBe(250);
  });

  it("clamps next-level XP at the top level", () => {
    expect(getXpForNextLevel(10)).toBe(10000);
  });
});

describe("getXpProgress", () => {
  it("is 0% at the start of a level", () => {
    expect(getXpProgress(0)).toBe(0);
    expect(getXpProgress(100)).toBe(0);
  });

  it("is 50% halfway between two thresholds", () => {
    // level 2 spans 100..250; midpoint 175
    expect(getXpProgress(175)).toBeCloseTo(50, 5);
  });

  it("is 100% at the max level", () => {
    expect(getXpProgress(10000)).toBe(100);
    expect(getXpProgress(50000)).toBe(100);
  });

  it("never returns a value outside 0..100", () => {
    for (const xp of [0, 1, 99, 100, 175, 999, 5000, 12345]) {
      const p = getXpProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

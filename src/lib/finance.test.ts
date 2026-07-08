import { describe, it, expect } from "vitest";
import {
  computeFinancialHealth,
  computeLiquidCash,
  type FinancialHealthInput,
} from "./finance";

describe("computeLiquidCash — canonical balance definition", () => {
  it("subtracts both expenses and goal contributions from income", () => {
    expect(
      computeLiquidCash({
        totalIncome: 10000,
        totalExpenses: 4000,
        totalGoalContributions: 2000,
      })
    ).toBe(4000);
  });

  it("treats goal money as set aside (not liquid)", () => {
    const withoutGoal = computeLiquidCash({
      totalIncome: 5000,
      totalExpenses: 1000,
      totalGoalContributions: 0,
    });
    const withGoal = computeLiquidCash({
      totalIncome: 5000,
      totalExpenses: 1000,
      totalGoalContributions: 1500,
    });
    expect(withoutGoal - withGoal).toBe(1500);
  });

  it("can go negative when outflows exceed income", () => {
    expect(
      computeLiquidCash({
        totalIncome: 1000,
        totalExpenses: 1200,
        totalGoalContributions: 300,
      })
    ).toBe(-500);
  });
});

const base: FinancialHealthInput = {
  totalIncome: 0,
  totalNeeds: 0,
  totalWants: 0,
  totalUnnecessary: 0,
  totalGoals: 0,
  totalSavings: 0,
  rentExpense: 0,
  totalLiquidCash: 0,
  totalBorrowedPending: 0,
};

describe("computeFinancialHealth — no income", () => {
  it("returns zeroed percentages and a 'No Income Data' verdict", () => {
    const r = computeFinancialHealth({ ...base });
    expect(r.needsPct).toBe(0);
    expect(r.wantsPct).toBe(0);
    expect(r.savingsPct).toBe(0);
    expect(r.verdict).toBe("No Income Data");
    expect(r.tone).toBe("none");
    // savings & needs score are 0 without income; dti defaults full, emergency 0
    expect(r.savingsScore).toBe(0);
    expect(r.needsScore).toBe(0);
    expect(r.dtiScore).toBe(20);
    expect(r.emergencyScore).toBe(0);
    expect(r.finalScore).toBe(20);
  });

  it("does not divide by zero when needs is zero", () => {
    const r = computeFinancialHealth({ ...base, totalLiquidCash: 5000 });
    expect(r.emergencyMonthsCovered).toBe(0);
    expect(Number.isNaN(r.emergencyScore)).toBe(false);
  });
});

describe("computeFinancialHealth — 50/30/20 shares", () => {
  it("maps tagged spend to needs/wants/savings percentages", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 500,
      totalWants: 200,
      totalUnnecessary: 100, // folds into wants
      totalSavings: 100,
      totalGoals: 100, // savings = savings + goals
    });
    expect(r.needsPct).toBe(50);
    expect(r.wantsPct).toBe(30); // (200 + 100) / 1000
    expect(r.savingsPct).toBe(20); // (100 + 100) / 1000
    expect(r.targetNeeds).toBe(500);
    expect(r.targetWants).toBe(300);
    expect(r.targetSavings).toBe(200);
  });
});

describe("computeFinancialHealth — score components", () => {
  it("awards full savings score at a 20% savings rate", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalSavings: 200,
    });
    expect(r.savingsScore).toBe(30);
  });

  it("caps savings score at 30 even above a 20% rate", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalSavings: 600, // 60% rate
    });
    expect(r.savingsScore).toBe(30);
  });

  it("gives full needs score at or under the 50% limit and decays above it", () => {
    const atLimit = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 500,
    });
    expect(atLimit.needsScore).toBe(30);

    const over = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 750, // 75% → 25 over → 30 - (25/50)*30 = 15
    });
    expect(over.needsScore).toBeCloseTo(15, 5);

    const maxedOut = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 1000, // 100% needs → score floors at 0
    });
    expect(maxedOut.needsScore).toBe(0);
  });

  it("keeps full DTI score when there is no debt", () => {
    const r = computeFinancialHealth({ ...base, totalIncome: 1000 });
    expect(r.dtiScore).toBe(20);
    expect(r.dtiRulePassed).toBe(true);
  });

  it("penalises DTI above 36%", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalBorrowedPending: 500, // DTI 50% → 20 - ((50-36)/64)*20 = 15.625
    });
    expect(r.dtiRatio).toBe(50);
    expect(r.dtiRulePassed).toBe(false);
    expect(r.dtiScore).toBeCloseTo(15.625, 3);
  });

  it("awards full emergency score at 6 months of needs covered", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 500,
      totalLiquidCash: 3000, // 6 months
    });
    expect(r.emergencyMonthsCovered).toBe(6);
    expect(r.emergencyScore).toBe(20);
    expect(r.emergencyRulePassed).toBe(true);
  });
});

describe("computeFinancialHealth — verdict thresholds", () => {
  it("labels a strong profile Excellent (score >= 80)", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 500, // needs 30
      totalSavings: 200, // savings 30
      totalLiquidCash: 3000, // emergency 20
      totalBorrowedPending: 0, // dti 20
    });
    expect(r.finalScore).toBe(100);
    expect(r.verdict).toBe("Excellent");
    expect(r.tone).toBe("excellent");
  });

  it("labels a mid profile Good (50 <= score < 80)", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 500, // needs 30
      totalSavings: 0, // savings 0
      totalLiquidCash: 0, // emergency 0
      totalBorrowedPending: 0, // dti 20
    });
    // 30 + 0 + 20 + 0 = 50
    expect(r.finalScore).toBe(50);
    expect(r.verdict).toBe("Good");
    expect(r.tone).toBe("good");
  });

  it("labels a weak profile Needs Attention (score < 50)", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      totalNeeds: 1000, // needs 0
      totalSavings: 0,
      totalLiquidCash: 0,
      totalBorrowedPending: 800, // heavy debt
    });
    expect(r.finalScore).toBeLessThan(50);
    expect(r.verdict).toBe("Needs Attention");
    expect(r.tone).toBe("attention");
  });
});

describe("computeFinancialHealth — rent rule", () => {
  it("passes when rent is within 30% of income", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      rentExpense: 300,
    });
    expect(r.rentRulePassed).toBe(true);
  });

  it("fails when rent exceeds 30% of income", () => {
    const r = computeFinancialHealth({
      ...base,
      totalIncome: 1000,
      rentExpense: 400,
    });
    expect(r.rentRulePassed).toBe(false);
  });
});

/**
 * Pure financial-health calculations.
 *
 * Extracted from the financial-health page so the math can be unit-tested and
 * reused without pulling in React. Behaviour must stay identical to what the
 * UI previously computed inline.
 */

/**
 * Canonical "liquid cash" / available-balance definition, shared by the
 * dashboard and the financial-health page so the two can never disagree.
 *
 * Money moved into a savings goal is treated as set aside — it is NOT liquid
 * and does NOT count toward an emergency-fund buffer — so goal contributions
 * are subtracted alongside expenses.
 */
export function computeLiquidCash(input: {
  totalIncome: number;
  totalExpenses: number;
  totalGoalContributions: number;
}): number {
  return input.totalIncome - input.totalExpenses - input.totalGoalContributions;
}

export interface FinancialHealthInput {
  totalIncome: number;
  totalNeeds: number;
  totalWants: number;
  totalUnnecessary: number;
  totalGoals: number;
  totalSavings: number;
  rentExpense: number;
  totalLiquidCash: number;
  totalBorrowedPending: number;
}

export type HealthTone = "excellent" | "good" | "attention" | "none";

export interface FinancialHealthResult {
  // 50/30/20 shares (percent of income)
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  // Rupee targets
  targetNeeds: number;
  targetWants: number;
  targetSavings: number;
  // Stability rules
  rentRulePassed: boolean;
  emergencyTarget: number;
  emergencyRulePassed: boolean;
  emergencyMonthsCovered: number;
  dtiRatio: number;
  dtiRulePassed: boolean;
  // Score breakdown (max: 30 / 30 / 20 / 20)
  savingsScore: number;
  needsScore: number;
  dtiScore: number;
  emergencyScore: number;
  finalScore: number;
  // Verdict
  verdict: string;
  tone: HealthTone;
}

const TARGET_SAVINGS_RATE = 20; // percent
const TARGET_NEEDS_LIMIT = 50; // percent
const DTI_LIMIT = 36; // percent
const EMERGENCY_MONTHS = 6;

export function computeFinancialHealth(
  input: FinancialHealthInput
): FinancialHealthResult {
  const {
    totalIncome,
    totalNeeds,
    totalWants,
    totalUnnecessary,
    totalGoals,
    totalSavings,
    rentExpense,
    totalLiquidCash,
    totalBorrowedPending,
  } = input;

  const hasIncome = totalIncome > 0;

  // 50/30/20 shares
  const needsPct = hasIncome ? (totalNeeds / totalIncome) * 100 : 0;
  const wantsPct = hasIncome
    ? ((totalWants + totalUnnecessary) / totalIncome) * 100
    : 0;
  const savingsPct = hasIncome
    ? ((totalSavings + totalGoals) / totalIncome) * 100
    : 0;

  const targetNeeds = totalIncome * 0.5;
  const targetWants = totalIncome * 0.3;
  const targetSavings = totalIncome * 0.2;

  // Stability rules
  const rentRulePassed = hasIncome && rentExpense <= totalIncome * 0.3;

  const emergencyTarget = totalNeeds * EMERGENCY_MONTHS;
  const emergencyRulePassed = totalLiquidCash >= emergencyTarget;
  const emergencyMonthsCovered =
    totalNeeds > 0 ? totalLiquidCash / totalNeeds : 0;

  const dtiRatio = hasIncome ? (totalBorrowedPending / totalIncome) * 100 : 0;
  const dtiRulePassed = dtiRatio <= DTI_LIMIT;

  // 1. Savings rate (30 pts)
  let savingsScore = 0;
  if (hasIncome) {
    savingsScore = Math.min(30, (savingsPct / TARGET_SAVINGS_RATE) * 30);
  }

  // 2. Needs adherence (30 pts)
  let needsScore = 0;
  if (hasIncome) {
    needsScore =
      needsPct <= TARGET_NEEDS_LIMIT
        ? 30
        : Math.max(0, 30 - ((needsPct - TARGET_NEEDS_LIMIT) / 50) * 30);
  }

  // 3. Debt-to-income (20 pts) — full marks unless there is debt above the limit
  let dtiScore = 20;
  if (hasIncome && totalBorrowedPending > 0) {
    dtiScore =
      dtiRatio <= DTI_LIMIT
        ? 20
        : Math.max(0, 20 - ((dtiRatio - DTI_LIMIT) / 64) * 20);
  }

  // 4. Emergency fund cover (20 pts)
  const emergencyScore = Math.min(
    20,
    (emergencyMonthsCovered / EMERGENCY_MONTHS) * 20
  );

  const finalScore = Math.round(
    savingsScore + needsScore + dtiScore + emergencyScore
  );

  let verdict = "Needs Attention";
  let tone: HealthTone = "attention";
  if (!hasIncome) {
    verdict = "No Income Data";
    tone = "none";
  } else if (finalScore >= 80) {
    verdict = "Excellent";
    tone = "excellent";
  } else if (finalScore >= 50) {
    verdict = "Good";
    tone = "good";
  }

  return {
    needsPct,
    wantsPct,
    savingsPct,
    targetNeeds,
    targetWants,
    targetSavings,
    rentRulePassed,
    emergencyTarget,
    emergencyRulePassed,
    emergencyMonthsCovered,
    dtiRatio,
    dtiRulePassed,
    savingsScore,
    needsScore,
    dtiScore,
    emergencyScore,
    finalScore,
    verdict,
    tone,
  };
}

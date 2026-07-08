import { Types } from "mongoose";
import { dbConnect } from "@/lib/db";
import Expense from "@/models/expense";
import Income from "@/models/income";
import BorrowLend from "@/models/borrow-lend";
import Budget from "@/models/budget";
import UserStats from "@/models/user-stats";
import { EXPENSE_CATEGORIES } from "@/constants";
import { subDays, subMonths, startOfMonth } from "date-fns";

function randomBetween(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

function randomDate(start: Date, end: Date) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

const incomeSources = [
  "Salary",
  "Freelance",
  "Side Project",
  "Dividends",
  "Refund",
];

const personNames = [
  "Akhil",
  "Priya",
  "Rahul",
  "Sneha",
  "Arun",
  "Meera",
];

const expenseNotes: Record<string, string[]> = {
  Food: ["Lunch", "Dinner", "Groceries", "Snacks", "Coffee"],
  Travel: ["Uber", "Bus pass", "Train ticket", "Fuel"],
  Rent: ["Monthly rent"],
  Shopping: ["Amazon", "Clothes", "Electronics"],
  Bills: ["Electricity", "Water", "Internet", "Phone"],
  Health: ["Medicine", "Doctor visit", "Gym"],
  Education: ["Books", "Course", "Subscription"],
  Other: ["Miscellaneous"],
};

export async function seedDatabase(userIdInput: string | Types.ObjectId) {
  await dbConnect();
  const userId = new Types.ObjectId(userIdInput);

  // Clear this user's existing data only
  await Promise.all([
    Expense.deleteMany({ userId }),
    Income.deleteMany({ userId }),
    BorrowLend.deleteMany({ userId }),
    Budget.deleteMany({ userId }),
    UserStats.deleteMany({ userId }),
  ]);

  const now = new Date();

  // Generate 3 months of expenses
  const expenses = [];
  for (let m = 0; m < 3; m++) {
    const monthStart = startOfMonth(subMonths(now, m));
    const monthEnd = m === 0 ? now : subDays(startOfMonth(subMonths(now, m - 1)), 1);

    const numExpenses = randomBetween(20, 40);
    for (let i = 0; i < numExpenses; i++) {
      const category =
        EXPENSE_CATEGORIES[randomBetween(0, EXPENSE_CATEGORIES.length - 1)];
      const notes = expenseNotes[category] ?? [""];
      expenses.push({
        userId,
        amount: randomBetween(50, 5000),
        category,
        note: notes[randomBetween(0, notes.length - 1)],
        date: randomDate(monthStart, monthEnd),
      });
    }
  }
  await Expense.insertMany(expenses);

  // Generate 3 months of income
  const incomes = [];
  for (let m = 0; m < 3; m++) {
    const monthStart = startOfMonth(subMonths(now, m));
    // Main salary
    incomes.push({
      userId,
      amount: randomBetween(40000, 80000),
      source: "Salary",
      note: "Monthly salary",
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1),
    });
    // Random additional income
    const extraCount = randomBetween(0, 3);
    for (let i = 0; i < extraCount; i++) {
      const source =
        incomeSources[randomBetween(1, incomeSources.length - 1)];
      incomes.push({
        userId,
        amount: randomBetween(2000, 20000),
        source,
        note: `${source} payment`,
        date: randomDate(
          monthStart,
          m === 0 ? now : subDays(startOfMonth(subMonths(now, m - 1)), 1)
        ),
      });
    }
  }
  await Income.insertMany(incomes);

  // BorrowLend records
  const borrowLendRecords = [];
  for (let i = 0; i < 4; i++) {
    const person = personNames[randomBetween(0, personNames.length - 1)];
    const type = Math.random() > 0.5 ? "borrowed" : "lent";
    borrowLendRecords.push({
      userId,
      personName: person,
      amount: randomBetween(500, 10000),
      type,
      date: randomDate(subMonths(now, 2), now),
      dueDate: randomDate(now, subMonths(now, -2)),
      status: Math.random() > 0.4 ? "pending" : "settled",
      notes: `${type === "borrowed" ? "Borrowed from" : "Lent to"} ${person}`,
    });
  }
  await BorrowLend.insertMany(borrowLendRecords);

  // Budgets for current month
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const budgetAmounts: Record<string, number> = {
    Food: 8000,
    Travel: 3000,
    Rent: 15000,
    Shopping: 5000,
    Bills: 4000,
    Health: 2000,
    Education: 3000,
    Other: 2000,
  };
  const budgets = EXPENSE_CATEGORIES.map((category) => ({
    userId,
    category,
    amount: budgetAmounts[category] ?? 3000,
    month: currentMonth,
    year: currentYear,
  }));
  await Budget.insertMany(budgets);

  // User stats
  await UserStats.create({
    userId,
    totalXp: 175,
    level: 2,
    lastExpenseDate: now,
  });

  return {
    expenses: expenses.length,
    incomes: incomes.length,
    borrowLend: borrowLendRecords.length,
    budgets: budgets.length,
  };
}

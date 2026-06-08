import { dbConnect } from "../src/lib/db";
import Expense from "../src/models/expense";
import { getClientNow, getClientDayBounds } from "../src/lib/date-utils";

async function main() {
  await dbConnect();
  
  const now = new Date();
  console.log("Server system clock now (UTC):", now.toISOString());
  console.log("Server local time:", now.toString());
  
  // Simulated IST timezoneOffset is -330
  const timezoneOffset = -330; 
  console.log("\n--- TIMEZONE IST (-330) ---");
  
  const clientNow = getClientNow(timezoneOffset);
  console.log("clientNow:", clientNow.toISOString());
  
  const { start: todayStart, end: todayEnd } = getClientDayBounds(clientNow, timezoneOffset);
  console.log("todayStart (UTC):", todayStart.toISOString());
  console.log("todayEnd (UTC):", todayEnd.toISOString());
  
  // Find all expenses in the DB
  const allExpenses = await Expense.find().sort({ date: -1 }).limit(10).lean();
  console.log("\nRecent Expenses:");
  for (const exp of allExpenses) {
    console.log(`- Amount: ${exp.amount}, Category: ${exp.category}, Raw Date in DB: ${exp.date.toISOString()}, Inside bounds? ${exp.date >= todayStart && exp.date <= todayEnd}`);
  }
  
  process.exit(0);
}

main();

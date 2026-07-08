// One-off migration: assign every pre-existing (userId-less) document to the
// single existing user, now that all data models require a userId.
//
// Usage:  node scripts/backfill-user-scoping.mjs         (dry run, reports only)
//         node scripts/backfill-user-scoping.mjs --apply  (performs the update)
//
// Safe to re-run: it only touches documents where userId is missing.

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (looked in .env.local).");
  process.exit(1);
}

// Collections that hold user-owned data and are getting a userId backfill.
// `users` is intentionally excluded (it IS the owner).
const OWNED_COLLECTIONS = [
  "expenses",
  "incomes",
  "borrowlends",
  "budgets",
  "goals",
  "goalcontributions",
  "recurringexpenses",
  "usersettings",
  "userstats",
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Connected to "${db.databaseName}".\n`);

  // Resolve the single owner.
  const users = await db.collection("users").find({}).toArray();
  if (users.length === 0) {
    console.error("No users found — create a user account first, then re-run.");
    process.exit(1);
  }
  if (users.length > 1) {
    console.error(
      `Expected exactly one user, found ${users.length}. Aborting so data isn't misassigned.\n` +
        users.map((u) => `  - ${u._id} <${u.email}>`).join("\n")
    );
    process.exit(1);
  }
  const userId = users[0]._id;
  console.log(`Assigning orphaned data to user ${userId} <${users[0].email}>`);
  console.log(APPLY ? "Mode: APPLY\n" : "Mode: DRY RUN (pass --apply to write)\n");

  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name)
  );

  let grandTotal = 0;
  for (const name of OWNED_COLLECTIONS) {
    if (!existing.has(name)) {
      console.log(`  ${name.padEnd(20)} — collection absent, skipping`);
      continue;
    }
    const col = db.collection(name);
    const filter = { userId: { $exists: false } };
    const count = await col.countDocuments(filter);
    grandTotal += count;

    if (APPLY && count > 0) {
      const res = await col.updateMany(filter, { $set: { userId } });
      console.log(`  ${name.padEnd(20)} — updated ${res.modifiedCount}`);
    } else {
      console.log(`  ${name.padEnd(20)} — ${count} document(s) need userId`);
    }
  }

  console.log(
    `\n${APPLY ? "Backfill complete." : "Dry run complete."} ` +
      `${grandTotal} orphaned document(s) ${APPLY ? "assigned" : "found"}.`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

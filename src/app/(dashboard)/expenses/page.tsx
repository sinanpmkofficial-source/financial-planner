import { Suspense } from "react";
import { ExpensesClient } from "@/components/expenses/expenses-client";

export default function ExpensesPage() {
  return (
    <Suspense>
      <ExpensesClient />
    </Suspense>
  );
}

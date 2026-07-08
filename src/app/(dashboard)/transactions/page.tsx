import { Suspense } from "react";
import { TransactionsClient } from "@/components/transactions/transactions-client";

export const metadata = {
  title: "Transactions - Nova Finance",
  description: "View and manage all your income and expenses in one consolidated timeline.",
};

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsClient />
    </Suspense>
  );
}

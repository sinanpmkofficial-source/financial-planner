import { Suspense } from "react";
import { IncomeClient } from "@/components/income/income-client";

export default function IncomePage() {
  return (
    <Suspense>
      <IncomeClient />
    </Suspense>
  );
}

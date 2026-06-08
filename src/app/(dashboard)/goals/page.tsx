import { GoalsClient } from "./goals-client";

export const metadata = {
  title: "Goals Tracker - Nova Finance",
  description: "Track your financial goals,emergency funds, and buy objectives.",
};

export default function GoalsPage() {
  return <GoalsClient />;
}

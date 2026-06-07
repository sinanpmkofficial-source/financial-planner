import { CURRENCY_SYMBOL } from "@/constants";
import { format, parseISO } from "date-fns";
import { utcToLocal } from "./date-utils";

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString("en-IN")}`;
}

export function formatDate(date: string | Date): string {
  const local = utcToLocal(date);
  return format(local, "dd/MM/yyyy");
}

export function formatDateShort(date: string | Date): string {
  const local = utcToLocal(date);
  return format(local, "dd MMM");
}

export function formatMonthYear(month: number, year: number): string {
  return format(new Date(year, month - 1), "MMMM yyyy");
}

export function getMonthDateRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function serializeDoc<T>(doc: unknown): T {
  return JSON.parse(JSON.stringify(doc)) as T;
}

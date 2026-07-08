import { CURRENCY_SYMBOL } from "@/constants";
import { format, parseISO } from "date-fns";
import { utcToLocal } from "./date-utils";

/**
 * Format an amount held in integer paise (minor units) as a rupee string.
 * Whole amounts render without decimals; fractional amounts show up to 2.
 */
export function formatCurrency(paise: number): string {
  const rupees = (Number.isFinite(paise) ? paise : 0) / 100;
  return `${CURRENCY_SYMBOL}${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

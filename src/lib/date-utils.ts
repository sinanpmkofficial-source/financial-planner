import {
  startOfDay as fnsStartOfDay,
  endOfDay as fnsEndOfDay,
  startOfWeek as fnsStartOfWeek,
  endOfWeek as fnsEndOfWeek,
  startOfMonth as fnsStartOfMonth,
  endOfMonth as fnsEndOfMonth,
  startOfYear as fnsStartOfYear,
  endOfYear as fnsEndOfYear,
  parseISO,
} from "date-fns";

// Shift a UTC Date to a Local Date so its local fields match its UTC representation
export function utcToLocal(date: Date | string): Date {
  const d = typeof date === "string" ? parseISO(date) : date;
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}

// Convert a Local Date to UTC representation
export function localToUtc(date: Date): Date {
  return new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ));
}

// Reconstruct client's "now" using their timezone offset (in minutes)
export function getClientNow(timezoneOffset?: number): Date {
  const now = new Date();
  if (timezoneOffset === undefined) return now;
  // Shift server now to match client's local calendar time
  return new Date(now.getTime() - timezoneOffset * 60 * 1000);
}

// Calculate client-timezone-aware start and end of day in UTC
export function getClientDayBounds(clientNow: Date, timezoneOffset?: number) {
  const start = fnsStartOfDay(clientNow);
  const end = fnsEndOfDay(clientNow);
  if (timezoneOffset === undefined) return { start, end };
  return {
    start: new Date(start.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(end.getTime() + timezoneOffset * 60 * 1000),
  };
}

// Calculate client-timezone-aware start and end of week in UTC
export function getClientWeekBounds(clientNow: Date, timezoneOffset?: number) {
  const start = fnsStartOfWeek(clientNow, { weekStartsOn: 1 });
  const end = fnsEndOfWeek(clientNow, { weekStartsOn: 1 });
  if (timezoneOffset === undefined) return { start, end };
  return {
    start: new Date(start.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(end.getTime() + timezoneOffset * 60 * 1000),
  };
}

// Calculate client-timezone-aware start and end of year in UTC
export function getClientYearBounds(clientNow: Date, timezoneOffset?: number) {
  const start = fnsStartOfYear(clientNow);
  const end = fnsEndOfYear(clientNow);
  if (timezoneOffset === undefined) return { start, end };
  return {
    start: new Date(start.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(end.getTime() + timezoneOffset * 60 * 1000),
  };
}

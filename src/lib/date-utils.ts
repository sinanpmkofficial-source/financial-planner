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
  let d: Date;
  if (typeof date === "string") {
    d = parseISO(date);
    if (isNaN(d.getTime())) {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) {
    return new Date();
  }

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
  // Shift absolute now to match client's local calendar time in UTC representation
  return new Date(now.getTime() - timezoneOffset * 60 * 1000);
}

// Calculate client-timezone-aware start and end of day in UTC
export function getClientDayBounds(clientNow: Date, timezoneOffset?: number) {
  if (timezoneOffset === undefined) {
    return {
      start: fnsStartOfDay(clientNow),
      end: fnsEndOfDay(clientNow),
    };
  }
  const startLocal = new Date(clientNow);
  startLocal.setUTCHours(0, 0, 0, 0);
  
  const endLocal = new Date(clientNow);
  endLocal.setUTCHours(23, 59, 59, 999);
  
  return {
    start: new Date(startLocal.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(endLocal.getTime() + timezoneOffset * 60 * 1000),
  };
}

// Calculate client-timezone-aware start and end of week in UTC
export function getClientWeekBounds(clientNow: Date, timezoneOffset?: number) {
  if (timezoneOffset === undefined) {
    return {
      start: fnsStartOfWeek(clientNow, { weekStartsOn: 1 }),
      end: fnsEndOfWeek(clientNow, { weekStartsOn: 1 }),
    };
  }
  const dayOfWeek = (clientNow.getUTCDay() + 6) % 7;
  
  const startLocal = new Date(clientNow);
  startLocal.setUTCDate(clientNow.getUTCDate() - dayOfWeek);
  startLocal.setUTCHours(0, 0, 0, 0);
  
  const endLocal = new Date(startLocal);
  endLocal.setUTCDate(startLocal.getUTCDate() + 6);
  endLocal.setUTCHours(23, 59, 59, 999);
  
  return {
    start: new Date(startLocal.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(endLocal.getTime() + timezoneOffset * 60 * 1000),
  };
}

// Calculate client-timezone-aware start and end of year in UTC
export function getClientYearBounds(clientNow: Date, timezoneOffset?: number) {
  if (timezoneOffset === undefined) {
    return {
      start: fnsStartOfYear(clientNow),
      end: fnsEndOfYear(clientNow),
    };
  }
  const startLocal = new Date(clientNow);
  startLocal.setUTCMonth(0, 1);
  startLocal.setUTCHours(0, 0, 0, 0);
  
  const endLocal = new Date(clientNow);
  endLocal.setUTCMonth(11, 31);
  endLocal.setUTCHours(23, 59, 59, 999);
  
  return {
    start: new Date(startLocal.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(endLocal.getTime() + timezoneOffset * 60 * 1000),
  };
}

// Calculate client-timezone-aware start and end of month in UTC
export function getClientMonthBounds(clientNow: Date, timezoneOffset?: number) {
  if (timezoneOffset === undefined) {
    return {
      start: fnsStartOfMonth(clientNow),
      end: fnsEndOfMonth(clientNow),
    };
  }
  const startLocal = new Date(clientNow);
  startLocal.setUTCDate(1);
  startLocal.setUTCHours(0, 0, 0, 0);
  
  const endLocal = new Date(clientNow);
  endLocal.setUTCMonth(clientNow.getUTCMonth() + 1, 0);
  endLocal.setUTCHours(23, 59, 59, 999);
  
  return {
    start: new Date(startLocal.getTime() + timezoneOffset * 60 * 1000),
    end: new Date(endLocal.getTime() + timezoneOffset * 60 * 1000),
  };
}


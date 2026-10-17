import { describe, expect, it } from "vitest";
import { calendarDifference, daysBetween, describeElapsed, todayLocal } from "../calendarDay";

describe("todayLocal", () => {
  it("is the local calendar date of the date given, padded, so a test can fix it", () => {
    expect(todayLocal(new Date(2026, 9, 7, 23, 59))).toBe("2026-10-07");
    expect(todayLocal(new Date(2027, 0, 1, 0, 0))).toBe("2027-01-01");
  });

  it("is a YYYY-MM-DD date when the clock is used", () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("calendarDifference", () => {
  it.each([
    ["2026-04-10", "2026-04-10", { years: 0, months: 0, days: 0 }],
    ["2026-04-10", "2026-04-22", { years: 0, months: 0, days: 12 }],
    ["2026-04-10", "2026-10-17", { years: 0, months: 6, days: 7 }],
    ["2026-04-10", "2027-06-12", { years: 1, months: 2, days: 2 }],
    ["2026-01-31", "2026-02-28", { years: 0, months: 1, days: 0 }],
    ["2026-01-31", "2026-03-01", { years: 0, months: 1, days: 1 }],
    ["2024-02-29", "2025-02-28", { years: 1, months: 0, days: 0 }],
    ["2026-12-15", "2027-01-14", { years: 0, months: 0, days: 30 }],
    ["2026-12-15", "2027-01-15", { years: 0, months: 1, days: 0 }],
  ])("counts calendar months from %s to %s", (from, to, expected) => {
    expect(calendarDifference(from, to)).toEqual(expected);
  });

  it("is null when the second date is earlier", () => {
    expect(calendarDifference("2026-04-10", "2026-04-09")).toBeNull();
  });
});

describe("describeElapsed", () => {
  it.each([
    ["2026-04-10", "2026-04-10", "0 days"],
    ["2026-04-10", "2026-04-11", "1 day"],
    ["2026-04-10", "2026-04-22", "12 days"],
    ["2026-04-10", "2026-10-17", "6 months, 7 days (190 days)"],
    ["2026-04-10", "2026-05-10", "1 month (30 days)"],
    ["2026-04-10", "2027-04-10", "1 year (365 days)"],
    ["2026-04-10", "2027-06-12", "1 year, 2 months, 2 days (428 days)"],
  ])("describes %s to %s as %j", (from, to, text) => {
    expect(describeElapsed(from, to)).toBe(text);
    expect(daysBetween(from, to)).toBe(Number(text.match(/\((\d+) days?\)/)?.[1] ?? text.match(/^(\d+)/)?.[1]));
  });

  it("is null when the second date is earlier", () => {
    expect(describeElapsed("2026-04-10", "2026-04-09")).toBeNull();
  });
});

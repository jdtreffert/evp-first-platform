import { isValidEventDate, isValidUid } from "../fieldValidators";

describe("isValidUid", () => {
  test.each(["E1", "rec123", "EVP-ABC123DEF456", "UID-1A2B3C4D", "a.b_c:d-e"])("accepts %s", (v) => {
    expect(isValidUid(v)).toBe(true);
  });

  test.each(["", " ", "-leading", "has space", "semi;colon", "a".repeat(129)])("rejects %p", (v) => {
    expect(isValidUid(v)).toBe(false);
  });
});

describe("isValidEventDate", () => {
  test.each([
    "2024-01-31",
    "2024-02-29",
    "2024-01-01T10:30Z",
    "2024-01-01T10:30:15.123+05:30",
  ])("accepts %s", (v) => {
    expect(isValidEventDate(v)).toBe(true);
  });

  test.each([
    "",
    "2024-02-30",
    "2023-02-29",
    "2024-13-01",
    "2024-00-10",
    "01/02/2024",
    "2024-1-2",
    "2024-01-01T25:00Z",
    "2024-01-01T10:30",
    "not a date",
  ])("rejects %p", (v) => {
    expect(isValidEventDate(v)).toBe(false);
  });
});

import { UnifiedEvent } from "../../types/UnifiedEvents";
import { EventQuery, applyEventQuery } from "../eventQuery";

const ev = (uid: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent => ({
  uid,
  masterId: "M1",
  eventType: "Note",
  eventDate,
  payload: { id: uid, fields: {} },
  ...extra,
});

const q = (over: Partial<EventQuery> = {}): EventQuery => ({ order: "asc", limit: 50, offset: 0, ...over });
const uids = (events: UnifiedEvent[]) => events.map((e) => e.uid);

const data = [
  ev("c", "2024-03-01"),
  ev("a", "2024-01-01"),
  ev("undated", null),
  ev("b", "2024-02-01T23:30:00-05:00", { masterId: "M2", eventType: "Labs" }),
];

describe("applyEventQuery", () => {
  test("sorts ascending with undated events last", () => {
    expect(uids(applyEventQuery(data, q()).events)).toEqual(["a", "b", "c", "undated"]);
  });

  test("sorts descending but still keeps undated events last", () => {
    expect(uids(applyEventQuery(data, q({ order: "desc" })).events)).toEqual(["c", "b", "a", "undated"]);
  });

  test("breaks date ties by uid for stable pages", () => {
    const tied = [ev("z", "2024-01-01"), ev("m", "2024-01-01")];
    expect(uids(applyEventQuery(tied, q()).events)).toEqual(["m", "z"]);
    expect(uids(applyEventQuery(tied, q({ order: "desc" })).events)).toEqual(["m", "z"]);
  });

  test("filters by masterId and eventType", () => {
    expect(uids(applyEventQuery(data, q({ masterId: "M2" })).events)).toEqual(["b"]);
    expect(uids(applyEventQuery(data, q({ eventType: "Labs" })).events)).toEqual(["b"]);
    expect(applyEventQuery(data, q({ masterId: "M2", eventType: "Note" })).total).toBe(0);
  });

  test("date range is inclusive and uses the recorded calendar date", () => {
    expect(uids(applyEventQuery(data, q({ from: "2024-02-01", to: "2024-03-01" })).events)).toEqual(["b", "c"]);
    expect(uids(applyEventQuery(data, q({ to: "2024-01-01" })).events)).toEqual(["a"]);
  });

  test("undated events never match a date range", () => {
    expect(uids(applyEventQuery(data, q({ from: "2000-01-01" })).events)).not.toContain("undated");
    expect(uids(applyEventQuery(data, q()).events)).toContain("undated");
  });

  test("paginates and reports the unpaginated total", () => {
    const page = applyEventQuery(data, q({ limit: 2, offset: 1 }));
    expect(uids(page.events)).toEqual(["b", "c"]);
    expect(page).toMatchObject({ total: 4, limit: 2, offset: 1 });
  });

  test("an offset past the end returns no events", () => {
    expect(applyEventQuery(data, q({ offset: 10 }))).toMatchObject({ events: [], total: 4 });
  });

  test("does not mutate the input array", () => {
    const copy = [...data];
    applyEventQuery(data, q({ order: "desc" }));
    expect(data).toEqual(copy);
  });
});

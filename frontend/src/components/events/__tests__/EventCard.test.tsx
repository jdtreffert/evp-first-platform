import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import EventCard from "../EventCard";
import WithdrawnEvents from "../WithdrawnEvents";

const event: UnifiedEvent = {
  uid: "E1",
  masterId: "M1",
  eventType: "ctDNA",
  eventDate: "2026-08-20",
  payload: { id: "E1", fields: {} },
};

const text = (html: string) => html.replaceAll("<!-- -->", "");

describe("EventCard withdrawal", () => {
  it("offers Withdraw only to those who may write, and asks for confirmation first", () => {
    const readOnly = text(renderToString(<EventCard event={event} />));
    const writer = text(renderToString(<EventCard event={event} onWithdraw={async () => undefined} />));

    expect(readOnly).not.toContain("Withdraw");
    expect(writer).toContain("Withdraw");
    expect(writer).not.toContain("entered in error");
  });
});

describe("WithdrawnEvents (first render, before events load)", () => {
  it("starts collapsed, with nothing to restore until the list has loaded", () => {
    const html = text(renderToString(<WithdrawnEvents masterId="M1" canRestore version={0} onRestored={async () => undefined} />));

    expect(html).toContain("Show withdrawn events");
    expect(html).not.toContain("Restore");
  });
});

import { Request, Response } from "express";
import { InMemoryEventRepository } from "../../persistence/__tests__/inMemoryEventRepository";
import { HttpError } from "../../utils/httpError";
import { createQueryController } from "../queryController";

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

async function setup() {
  const repo = new InMemoryEventRepository();
  await repo.save({
    uid: "E1",
    masterId: "M1",
    eventType: "Note",
    eventDate: "2024-01-01",
    payload: { id: "r", fields: {} },
  });
  return createQueryController(repo);
}

describe("createQueryController", () => {
  test("query responds 200 with a page of events", async () => {
    const res = mockRes();
    await (await setup()).queryEventsController({ query: { masterId: "M1" } } as unknown as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
  });

  test("query propagates validation errors", async () => {
    await expect(
      (await setup()).queryEventsController({ query: { limit: "0" } } as unknown as Request, mockRes() as unknown as Response),
    ).rejects.toThrow(HttpError);
  });

  test("get responds 200 with the event, and propagates 404", async () => {
    const controller = await setup();
    const res = mockRes();
    await controller.getEventController({ params: { uid: "E1" } } as unknown as Request, res as unknown as Response);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ uid: "E1" }));

    await expect(
      controller.getEventController({ params: { uid: "zzz" } } as unknown as Request, mockRes() as unknown as Response),
    ).rejects.toThrow("Event not found");
  });
});

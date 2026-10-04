import { Request, Response } from "express";
import { InMemoryEventRepository } from "../../persistence/__tests__/inMemoryEventRepository";
import { HttpError } from "../../utils/httpError";
import { createIngestionController } from "../ingestionController";

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const validBody = {
  id: "r1",
  fields: { Event_Type: "Note", Master_ID: "M1", Event_Details: "x" },
};

describe("createIngestionController", () => {
  test("persists the event and responds 201 when it is new", async () => {
    const repo = new InMemoryEventRepository();
    const res = mockRes();

    await createIngestionController(repo)({ body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ eventType: "Note", uid: "r1" }));
    expect(repo.events.has("r1")).toBe(true);
  });

  test("responds 200 when the uid already exists", async () => {
    const repo = new InMemoryEventRepository();
    const controller = createIngestionController(repo);

    await controller({ body: validBody } as Request, mockRes() as unknown as Response);
    const res = mockRes();
    await controller({ body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(repo.events.size).toBe(1);
  });

  test("does not persist invalid input", async () => {
    const repo = new InMemoryEventRepository();
    const res = mockRes();

    await expect(
      createIngestionController(repo)({ body: {} } as Request, res as unknown as Response),
    ).rejects.toThrow(HttpError);
    expect(repo.events.size).toBe(0);
  });

  test("propagates storage failures", async () => {
    const repo = new InMemoryEventRepository();
    repo.save = () => Promise.reject(new Error("disk full"));

    await expect(
      createIngestionController(repo)({ body: validBody } as Request, mockRes() as unknown as Response),
    ).rejects.toThrow("disk full");
  });
});

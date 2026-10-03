import { Request, Response } from "express";
import { ingestEventController } from "../ingestionController";
import { HttpError } from "../../utils/httpError";

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("ingestEventController", () => {
  test("responds 201 with the UnifiedEvent", () => {
    const res = mockRes();
    const req = { body: { id: "r1", fields: { Event_Type: "Other", Other_Description: "x" } } };
    ingestEventController(req as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ eventType: "Other", uid: "r1" }));
  });

  test("propagates validation errors to the error handler", () => {
    const res = mockRes();
    expect(() =>
      ingestEventController({ body: {} } as Request, res as unknown as Response),
    ).toThrow(HttpError);
  });
});

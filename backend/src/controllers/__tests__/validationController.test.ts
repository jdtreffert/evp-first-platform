import { Request, Response } from "express";
import { validateEventController } from "../validationController";

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("validateEventController", () => {
  test("responds 200 with a passing report", () => {
    const res = mockRes();
    const body = {
      uid: "E1",
      masterId: "M1",
      eventType: "Note",
      eventDate: null,
      payload: { id: "r", fields: {} },
    };
    validateEventController({ body } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ valid: true, errors: [] });
  });

  test("responds 200 with errors for an invalid event", () => {
    const res = mockRes();
    validateEventController({ body: {} } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false }));
  });
});

import { Request, Response } from "express";
import { errorHandler } from "../errorHandler";
import { HttpError } from "../../utils/httpError";

function mockRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  test("maps HttpError to its status and message", () => {
    const res = mockRes();
    errorHandler(new HttpError(422, "nope"), {} as Request, res as unknown as Response, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: "nope" });
  });

  test("includes error details when present", () => {
    const res = mockRes();
    const details = [{ path: "uid", message: "bad" }];
    errorHandler(new HttpError(422, "invalid", details), {} as Request, res as unknown as Response, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ error: "invalid", details });
  });

  test("maps body-parser JSON syntax errors to 400", () => {
    const res = mockRes();
    const err = Object.assign(new SyntaxError("bad"), { type: "entity.parse.failed" });
    errorHandler(err, {} as Request, res as unknown as Response, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Malformed JSON body" });
  });

  test("maps oversized bodies to 413", () => {
    const res = mockRes();
    const err = Object.assign(new Error("too large"), { type: "entity.too.large" });
    errorHandler(err, {} as Request, res as unknown as Response, jest.fn());
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Request body too large" });
  });

  test("hides details of unexpected errors", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const res = mockRes();
    errorHandler(new Error("secret"), {} as Request, res as unknown as Response, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    spy.mockRestore();
  });
});

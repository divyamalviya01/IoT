import { describe, expect, it } from "vitest";
import { LAB_TOKEN, handle, initialState, requestText, responseText, sizes } from "./engine";

describe("L07 REST device", () => {
  it("reads sensors with GET", () => {
    const { res } = handle(initialState(), { method: "GET", path: "/sensors/temperature" });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ value: 28.5, unit: "C" });
    expect(res.headers["Content-Length"]).toBe(String(res.body.length));
  });

  it("switches the LED with PUT and remembers it", () => {
    const put = handle(initialState(), { method: "PUT", path: "/actuators/led", body: '{"state":"on"}' });
    expect(put.res.status).toBe(200);
    expect(put.state.led).toBe("on");
    expect(JSON.parse(handle(put.state, { method: "GET", path: "/actuators/led" }).res.body)).toEqual({ state: "on" });
  });

  it("rejects a bad body with 400", () => {
    expect(handle(initialState(), { method: "PUT", path: "/actuators/led", body: "{state:on}" }).res.status).toBe(400);
    expect(handle(initialState(), { method: "PUT", path: "/actuators/led", body: '{"state":"blue"}' }).res.status).toBe(400);
  });

  it("creates readings with POST and returns 201 and a Location", () => {
    const { res, state } = handle(initialState(), { method: "POST", path: "/readings", body: '{"value":27.9}' });
    expect(res.status).toBe(201);
    expect(res.headers.Location).toBe("/readings/1");
    expect(state.readings).toEqual([{ id: 1, value: 27.9 }]);
  });

  it("answers 404 for unknown paths and 405 for wrong methods", () => {
    expect(handle(initialState(), { method: "GET", path: "/sensors/pressure" }).res.status).toBe(404);
    const del = handle(initialState(), { method: "DELETE", path: "/actuators/led" }).res;
    expect(del.status).toBe(405);
    expect(del.headers.Allow).toBe("GET, PUT");
  });

  it("requires a token when protected", () => {
    const locked = { ...initialState(), requireAuth: true };
    expect(handle(locked, { method: "GET", path: "/sensors" }).res.status).toBe(401);
    expect(handle(locked, { method: "GET", path: "/sensors", token: "wrong" }).res.status).toBe(401);
    expect(handle(locked, { method: "GET", path: "/sensors", token: LAB_TOKEN }).res.status).toBe(200);
  });

  it("ignores a trailing slash", () => {
    expect(handle(initialState(), { method: "GET", path: "/sensors/" }).res.status).toBe(200);
  });
});

describe("wire format", () => {
  it("builds valid HTTP/1.1 text with a correct Content-Length", () => {
    const text = requestText({ method: "PUT", path: "/actuators/led", body: '{"state":"on"}' });
    expect(text.startsWith("PUT /actuators/led HTTP/1.1\r\nHost: device.local\r\n")).toBe(true);
    expect(text).toContain("Content-Length: 14\r\n");
    expect(text.endsWith('\r\n\r\n{"state":"on"}')).toBe(true);
  });

  it("counts header and body bytes", () => {
    const { res } = handle(initialState(), { method: "GET", path: "/sensors/temperature" });
    const s = sizes(responseText(res));
    expect(s.bodyBytes).toBe(res.body.length);
    expect(s.headerBytes).toBeGreaterThan(s.bodyBytes);
    expect(s.overheadPct).toBeGreaterThan(50);
  });
});

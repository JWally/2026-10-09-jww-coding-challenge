import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { BookingStore } from "./bookingStore";

const validEvent = {
  booking_id: "bk_1042",
  property_id: "prop_88",
  status: "confirmed",
  sent_at: "2026-08-03T14:22:05Z",
};

describe("POST /events", function () {
  let store: BookingStore;
  let server: Server;
  let url: string;

  beforeEach(function () {
    store = new BookingStore();
    server = createApp(store).listen(0);
    const port = (server.address() as AddressInfo).port;
    url = "http://localhost:" + port + "/events";
  });

  afterEach(function () {
    server.close();
  });

  function post(body: object) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("stores a valid event", async function () {
    const response = await post(validEvent);

    expect(response.status).toBe(200);
    expect(store.get("bk_1042")).toEqual(validEvent);
  });

  it("acknowledges a duplicate with 200 so the sender stops retrying", async function () {
    await post(validEvent);
    const response = await post(validEvent);

    expect(response.status).toBe(200);
  });

  it.each([
    ["an unknown status", { ...validEvent, status: "shipped" }],
    ["an unparseable sent_at", { ...validEvent, sent_at: "yesterday" }],
    ["a missing booking_id", { ...validEvent, booking_id: undefined }],
    ["a blank booking_id", { ...validEvent, booking_id: "   " }],
    ["a missing property_id", { ...validEvent, property_id: undefined }],
    ["a blank property_id", { ...validEvent, property_id: "" }],
    ["a numeric sent_at", { ...validEvent, sent_at: 1754230925 }],
    ["an array body", [validEvent]],
  ])("rejects %s with 400", async function (_label, badEvent) {
    const response = await post(badEvent);

    expect(response.status).toBe(400);
    expect(store.get("bk_1042")).toBeUndefined();
  });

  it("rejects a body that is not JSON with 400", async function () {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });

    expect(response.status).toBe(400);
  });
});

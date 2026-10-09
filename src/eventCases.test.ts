// Runs every case in eventCases.json through the real API.
// To add a case, edit the JSON file. No code changes are needed.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { BookingStore } from "./bookingStore";

type EventCase = {
  name: string;
  events: { processed: boolean; event: object }[];
  finalStatus: Record<string, string>;
};

const cases: EventCase[] = JSON.parse(
  readFileSync(__dirname + "/eventCases.json", "utf8"),
);

describe("event cases", function () {
  it.each(cases)("$name", async function (testCase) {
    const store = new BookingStore();
    const server = createApp(store).listen(0);
    const port = (server.address() as AddressInfo).port;

    try {
      for (const step of testCase.events) {
        const response = await fetch("http://localhost:" + port + "/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(step.event),
        });
        const body = await response.json();
        expect(body.processed).toBe(step.processed);
      }

      for (const bookingId of Object.keys(testCase.finalStatus)) {
        expect(store.get(bookingId)?.status).toBe(testCase.finalStatus[bookingId]);
      }
    } finally {
      server.close();
    }
  });
});

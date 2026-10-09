import { describe, it, expect } from "vitest";
import { BookingStore } from "./bookingStore";

function makeEvent(status: string, sentAt: string, bookingId = "bk_1042") {
  return {
    booking_id: bookingId,
    property_id: "prop_88",
    status: status,
    sent_at: sentAt,
  };
}

describe("BookingStore", function () {
  it("stores the first event for a booking", function () {
    const store = new BookingStore();
    const event = makeEvent("pending", "2026-08-03T14:00:00Z");

    expect(store.apply(event)).toBe(true);
    expect(store.get("bk_1042")).toEqual(event);
  });

  it("ignores a duplicate event", function () {
    const store = new BookingStore();
    const event = makeEvent("confirmed", "2026-08-03T14:00:00Z");

    store.apply(event);

    expect(store.apply({ ...event })).toBe(false);
  });

  it("keeps the newer event when an older one arrives late", function () {
    const store = new BookingStore();
    const cancelled = makeEvent("cancelled", "2026-08-03T15:00:00Z");
    const confirmed = makeEvent("confirmed", "2026-08-03T14:00:00Z");

    store.apply(cancelled);

    expect(store.apply(confirmed)).toBe(false);
    expect(store.get("bk_1042")).toEqual(cancelled);
  });

  it("replaces the stored event with a newer one", function () {
    const store = new BookingStore();
    const confirmed = makeEvent("confirmed", "2026-08-03T14:00:00Z");
    const cancelled = makeEvent("cancelled", "2026-08-03T15:00:00Z");

    store.apply(confirmed);

    expect(store.apply(cancelled)).toBe(true);
    expect(store.get("bk_1042")).toEqual(cancelled);
  });

  describe("history", function () {
    it("records every event received, marking which were processed", function () {
      const store = new BookingStore();
      const pending = makeEvent("pending", "2026-08-03T14:00:00Z");
      const confirmed = makeEvent("confirmed", "2026-08-03T14:05:00Z");

      store.apply(pending);
      store.apply(confirmed);
      store.apply(confirmed);
      store.apply(pending);

      expect(store.getHistory("bk_1042")).toEqual([
        { event: pending, processed: true },
        { event: confirmed, processed: true },
        { event: confirmed, processed: false },
        { event: pending, processed: false },
      ]);
    });

    it("keeps each booking's events separate", function () {
      const store = new BookingStore();
      const first = makeEvent("pending", "2026-08-03T14:00:00Z", "bk_1");
      const second = makeEvent("pending", "2026-08-03T14:00:00Z", "bk_2");

      store.apply(first);
      store.apply(second);

      expect(store.getHistory("bk_1")).toEqual([{ event: first, processed: true }]);
      expect(store.getHistory("bk_2")).toEqual([{ event: second, processed: true }]);
    });

    it("is empty for an unknown booking", function () {
      const store = new BookingStore();

      expect(store.getHistory("bk_unknown")).toEqual([]);
    });
  });

  describe("when two events have the same sent_at", function () {
    const sameTime = "2026-08-03T14:00:00Z";

    it.each([
      ["confirmed", "cancelled"],
      ["confirmed", "pending"],
      ["cancelled", "pending"],
    ])("%s beats %s, whichever arrives first", function (winner, loser) {
      const winnerFirst = new BookingStore();
      winnerFirst.apply(makeEvent(winner, sameTime));
      expect(winnerFirst.apply(makeEvent(loser, sameTime))).toBe(false);
      expect(winnerFirst.get("bk_1042")?.status).toBe(winner);

      const loserFirst = new BookingStore();
      loserFirst.apply(makeEvent(loser, sameTime));
      expect(loserFirst.apply(makeEvent(winner, sameTime))).toBe(true);
      expect(loserFirst.get("bk_1042")?.status).toBe(winner);
    });
  });
});

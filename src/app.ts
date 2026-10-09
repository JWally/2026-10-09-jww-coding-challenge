import express from "express";
import { BookingStore, STATUS_PRIORITY } from "./bookingStore";

const VALID_STATUSES = Object.keys(STATUS_PRIORITY);

function isNonBlankString(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function isValidEvent(body: any): boolean {
  // body is undefined when the request wasn't sent as JSON.
  if (!body) {
    return false;
  }
  return (
    isNonBlankString(body.booking_id) &&
    isNonBlankString(body.property_id) &&
    VALID_STATUSES.includes(body.status) &&
    !isNaN(Date.parse(body.sent_at))
  );
}

export function createApp(store: BookingStore) {
  const app = express();
  app.use(express.json());

  app.post("/events", function (req, res) {
    if (!isValidEvent(req.body)) {
      res.status(400).json({ processed: false });
      return;
    }
    // Duplicates and stale events still get 200 so the sender stops retrying.
    const processed = store.apply(req.body);
    res.json({ processed: processed });
  });

  return app;
}

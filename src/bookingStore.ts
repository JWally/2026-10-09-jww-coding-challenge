export type BookingEvent = {
  booking_id: string;
  property_id: string;
  status: string;
  sent_at: string;
};

// When two events share a sent_at, the higher number wins.
export const STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  cancelled: 2,
  confirmed: 3,
};

function isNewer(event: BookingEvent, current: BookingEvent): boolean {
  const eventTime = Date.parse(event.sent_at);
  const currentTime = Date.parse(current.sent_at);
  if (eventTime !== currentTime) {
    return eventTime > currentTime;
  }
  // Same sent_at with the same status is a duplicate, so this returns false.
  return STATUS_PRIORITY[event.status] > STATUS_PRIORITY[current.status];
}

export type ReceivedEvent = {
  event: BookingEvent;
  processed: boolean;
};

// Everything we know about one booking.
type Booking = {
  current?: BookingEvent;
  history: ReceivedEvent[];
};

export class BookingStore {
  private bookings = new Map<string, Booking>();

  apply(event: BookingEvent): boolean {
    let booking = this.bookings.get(event.booking_id);
    if (!booking) {
      booking = { history: [] };
      this.bookings.set(event.booking_id, booking);
    }

    // Duplicates and late-arriving older events must not overwrite newer state.
    const processed = !booking.current || isNewer(event, booking.current);
    if (processed) {
      booking.current = event;
    }
    booking.history.push({ event: event, processed: processed });
    return processed;
  }

  get(bookingId: string): BookingEvent | undefined {
    const booking = this.bookings.get(bookingId);
    return booking ? booking.current : undefined;
  }

  getHistory(bookingId: string): ReceivedEvent[] {
    const booking = this.bookings.get(bookingId);
    return booking ? booking.history : [];
  }
}

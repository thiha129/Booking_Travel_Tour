export const BOOKING_SERVICE_FEE = 10;

const utcDay = (date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export const getBookingNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const nights = Math.round((utcDay(end) - utcDay(start)) / (1000 * 60 * 60 * 24));
  if (nights < 1) return 0;
  return nights;
};

export const getBookingSubtotal = (price, nights, guestSize) => {
  if (!nights || nights < 1) return 0;
  const guests = Math.max(Number(guestSize) || 1, 1);
  return Number(price) * nights * guests;
};

export const getBookingTotal = (price, nights, guestSize, serviceFee = BOOKING_SERVICE_FEE) => {
  const subtotal = getBookingSubtotal(price, nights, guestSize);
  if (!subtotal) return 0;
  return subtotal + serviceFee;
};

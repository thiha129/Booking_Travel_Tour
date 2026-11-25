export const remainingSeats = (departure) => {
  if (
    departure?.remainingSeats != null &&
    Number.isFinite(Number(departure.remainingSeats))
  ) {
    return Math.max(0, Number(departure.remainingSeats));
  }
  return Math.max(
    0,
    Number(departure?.capacity || 0) - Number(departure?.bookedSeats || 0)
  );
};

const toUtcDay = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const startOfTodayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

export const isUpcomingDeparture = (departure) => {
  const day = toUtcDay(departure?.date);
  return day != null && day >= startOfTodayUtc();
};

export const addDaysIso = (value, days) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
};

export const toDateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const getUpcomingDepartures = (tour) => {
  const list = Array.isArray(tour?.departures) ? [...tour.departures] : [];
  return list
    .filter((item) => item?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .filter(isUpcomingDeparture);
};

export const getTourAvailability = (tour) => {
  const schedule = Array.isArray(tour?.departures) ? tour.departures : [];
  const hasSchedule = schedule.length > 0;
  const upcoming = getUpcomingDepartures(tour);
  const open = upcoming.filter((item) => remainingSeats(item) > 0);
  const nextOpen = open[0] || null;

  return {
    hasSchedule,
    upcoming,
    nextOpen,
    remainingNext: nextOpen ? remainingSeats(nextOpen) : 0,
    soldOut: hasSchedule && open.length === 0,
  };
};

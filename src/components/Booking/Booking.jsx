import React, { useState, useContext, useEffect, useMemo } from "react";
import "./booking.css";
import { Form, ListGroup, ListGroupItem, Button, FormGroup } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  BOOKING_SERVICE_FEE,
  getBookingNights,
  getBookingSubtotal,
  getBookingTotal,
} from "../../utils/bookingPrice";
import {
  addDaysIso,
  getTourAvailability,
  remainingSeats,
  toDateInputValue,
} from "../../utils/departures";

const Booking = ({ tour, avgRating }) => {
  const { toast, promptLogin } = useToast();
  const { t, language } = useLanguage();
  const { price, reviews, title, _id, maxGroupSize } = tour;
  const navigate = useNavigate();
  const dateLocale = language === "vi" ? "vi-VN" : "en-US";

  const availability = useMemo(() => getTourAvailability(tour), [tour]);
  const durationDays = Math.max(Number(tour.durationDays) || 1, 1);
  const hasSchedule = availability.hasSchedule;

  const { user } = useContext(AuthContext);
  const [booking, setBooking] = useState({
    userId: user?._id || "",
    userEmail: user?.email || "",
    tourName: title,
    fullName: "",
    phone: "",
    guestSize: 1,
    checkIn: "",
    checkOut: "",
    departureId: "",
    tours: _id,
    totalPrice: 0,
  });

  useEffect(() => {
    if (!user) return;
    setBooking((prev) => ({
      ...prev,
      userId: user._id,
      userEmail: user.email,
    }));
  }, [user]);

  const selectedDeparture = useMemo(
    () =>
      availability.upcoming.find(
        (item) => String(item._id) === String(booking.departureId)
      ) || null,
    [availability.upcoming, booking.departureId]
  );

  const seatsLeft = selectedDeparture
    ? remainingSeats(selectedDeparture)
    : hasSchedule
      ? 0
      : Number(maxGroupSize) || 1;

  const guestMax = Math.max(
    1,
    hasSchedule ? seatsLeft || 1 : Number(maxGroupSize) || 1
  );

  const handleChange = (e) => {
    setBooking((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const selectDeparture = (departure) => {
    const left = remainingSeats(departure);
    if (left < 1) return;

    const checkIn = toDateInputValue(departure.date);
    setBooking((prev) => ({
      ...prev,
      departureId: departure._id,
      checkIn,
      checkOut: addDaysIso(departure.date, durationDays),
      guestSize: Math.min(Math.max(Number(prev.guestSize) || 1, 1), left),
    }));
  };

  const nights = useMemo(
    () => getBookingNights(booking.checkIn, booking.checkOut),
    [booking.checkIn, booking.checkOut]
  );

  const guestCount = Math.max(Number(booking.guestSize) || 1, 1);
  const subtotal = getBookingSubtotal(price, nights, guestCount);
  const totalAmount = getBookingTotal(price, nights, guestCount, BOOKING_SERVICE_FEE);
  const hasValidDates = nights > 0;
  const canBook = hasSchedule
    ? Boolean(selectedDeparture) && seatsLeft >= guestCount
    : hasValidDates;

  const formatDepartureDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(dateLocale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const handleContinue = (e) => {
    e.preventDefault();

    if (!user) {
      return promptLogin(t("toast.signInToBook"));
    }

    if (!booking.fullName?.trim() || !booking.phone) {
      return toast.warning(t("checkout.fillAllFields"));
    }

    if (hasSchedule) {
      if (!booking.departureId || !selectedDeparture) {
        return toast.warning(t("booking.selectDeparture"));
      }
      if (availability.soldOut) {
        return toast.warning(t("booking.soldOut"));
      }
      if (guestCount > seatsLeft) {
        return toast.warning(t("booking.notEnoughSeats", { count: seatsLeft }));
      }
    } else {
      if (!booking.checkIn || !booking.checkOut) {
        return toast.warning(t("checkout.fillAllFields"));
      }

      if (new Date(booking.checkOut) <= new Date(booking.checkIn)) {
        return toast.warning(t("checkout.invalidDates"));
      }

      if (guestCount > maxGroupSize) {
        return toast.warning(
          t("booking.maxGuestsExceeded", { max: maxGroupSize })
        );
      }
    }

    navigate("/booking/checkout", {
      state: {
        booking: { ...booking, totalPrice: totalAmount },
        tour: {
          _id: tour._id,
          title: tour.title,
          city: tour.city,
          photo: tour.photo,
          price,
          durationDays,
        },
        totalAmount,
        subtotal,
        nights,
        serviceFee: BOOKING_SERVICE_FEE,
      },
    });
  };

  return (
    <div className="booking">
      <div className="booking__top d-flex align-items-center justify-content-between">
        <h3>
          ${price} <span>{t("common.perPersonPerNight")}</span>
        </h3>
        <span className="tour__rating d-flex align-items-center justify-content-center gap-1">
          <i className="ri-star-fill"></i>
          {avgRating === 0 ? null : avgRating} ({reviews?.length})
        </span>
      </div>
      <div className="booking__form">
        <h5>{t("booking.information")}</h5>
        <Form className="booking__info-form" onSubmit={handleContinue}>
          <FormGroup>
            <input
              type="text"
              placeholder={t("booking.fullName")}
              id="fullName"
              required
              onChange={handleChange}
            />
          </FormGroup>
          <FormGroup>
            <input
              type="number"
              placeholder={t("booking.phone")}
              id="phone"
              required
              onChange={handleChange}
            />
          </FormGroup>

          {hasSchedule ? (
            <div className="booking__departures">
              <p className="booking__departures-label">
                {t("booking.selectDeparture")}
                <span>
                  {durationDays} {t("booking.durationDaysUnit")}
                </span>
              </p>
              {availability.upcoming.length === 0 ? (
                <p className="booking__departures-empty">
                  {t("booking.noUpcomingDepartures")}
                </p>
              ) : (
                <div className="booking__departures-list">
                  {availability.upcoming.map((departure) => {
                    const left = remainingSeats(departure);
                    const soldOut = left < 1;
                    const selected =
                      String(booking.departureId) === String(departure._id);
                    return (
                      <button
                        key={departure._id}
                        type="button"
                        className={`booking__departure ${selected ? "is-selected" : ""} ${soldOut ? "is-soldout" : ""}`}
                        disabled={soldOut}
                        onClick={() => selectDeparture(departure)}
                      >
                        <strong>{formatDepartureDate(departure.date)}</strong>
                        <small>
                          {soldOut
                            ? t("booking.soldOut")
                            : t("booking.seatsLeft", { count: left })}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <FormGroup className="d-flex align-items-center gap-3">
                <span>{t("booking.checkIn")}</span>
                <input
                  type="date"
                  id="checkIn"
                  required
                  onChange={handleChange}
                />
              </FormGroup>
              <FormGroup className="d-flex align-items-center gap-3">
                <span>{t("booking.checkOut")}</span>
                <input
                  type="date"
                  id="checkOut"
                  required
                  onChange={handleChange}
                  min={booking.checkIn}
                />
              </FormGroup>
            </>
          )}

          <FormGroup>
            <input
              type="number"
              placeholder={t("booking.guest")}
              min="1"
              max={guestMax}
              id="guestSize"
              value={booking.guestSize}
              required
              disabled={hasSchedule && !selectedDeparture}
              onChange={handleChange}
            />
          </FormGroup>
        </Form>
      </div>

      <div className="booking__bottom">
        <ListGroup>
          {hasValidDates ? (
            <ListGroupItem className="border-0 px-0">
              <h5 className="d-flex align-items-center gap-1 flex-wrap">
                ${price} × {nights} {t("booking.nights")} × {guestCount}{" "}
                {t("booking.guest")}
              </h5>
              <span>${subtotal}</span>
            </ListGroupItem>
          ) : (
            <ListGroupItem className="border-0 px-0 text-muted">
              <small>
                {hasSchedule
                  ? t("booking.selectDepartureForPrice")
                  : t("booking.selectDatesForPrice")}
              </small>
            </ListGroupItem>
          )}
          <ListGroupItem className="border-0 px-0">
            <h5>{t("booking.serviceCharge")}</h5>
            <span>${BOOKING_SERVICE_FEE}</span>
          </ListGroupItem>
          <ListGroupItem className="border-0 px-0 total">
            <h5>{t("booking.total")}</h5>
            <span>{hasValidDates ? `$${totalAmount}` : "—"}</span>
          </ListGroupItem>
        </ListGroup>
        <Button
          className="btn primary__btn w-100 mt-4"
          onClick={handleContinue}
          disabled={hasSchedule && !canBook}
        >
          {hasSchedule && availability.soldOut
            ? t("booking.soldOut")
            : t("checkout.continueToPayment")}
          {!(hasSchedule && availability.soldOut) && (
            <i className="ri-arrow-right-line ms-2"></i>
          )}
        </Button>
      </div>
    </div>
  );
};
export default Booking;

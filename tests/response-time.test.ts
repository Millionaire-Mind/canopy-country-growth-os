import { describe, it, expect } from "vitest";
import { formatResponseTime, formatAge, requiresAction, nextAction } from "@/lib/lead-format";

describe("formatResponseTime", () => {
  it("reports 'No response yet' when there is no first response", () => {
    expect(formatResponseTime(new Date("2026-08-13T00:00:00Z"), null)).toBe("No response yet");
  });

  it("formats sub-hour responses in minutes", () => {
    const created = new Date("2026-08-13T00:00:00Z");
    const responded = new Date("2026-08-13T00:22:00Z");
    expect(formatResponseTime(created, responded)).toBe("22 min");
  });

  it("formats multi-hour responses in hours", () => {
    const created = new Date("2026-08-13T00:00:00Z");
    const responded = new Date("2026-08-13T03:30:00Z");
    expect(formatResponseTime(created, responded)).toBe("3.5 hrs");
  });
});

describe("formatAge", () => {
  it("formats sub-day ages in hours", () => {
    const from = new Date("2026-08-13T00:00:00Z");
    const now = new Date("2026-08-13T05:00:00Z");
    expect(formatAge(from, now)).toBe("5h");
  });

  it("formats multi-day ages in days", () => {
    const from = new Date("2026-08-01T00:00:00Z");
    const now = new Date("2026-08-13T00:00:00Z");
    expect(formatAge(from, now)).toBe("12d");
  });
});

describe("requiresAction / nextAction", () => {
  it("flags an unanswered NEW lead and says 'Contact now'", () => {
    const lead = { status: "NEW", firstResponseAt: null, appointmentId: null };
    expect(requiresAction(lead)).toBe(true);
    expect(nextAction(lead)).toBe("Contact now");
  });

  it("flags a CONTACTED lead with no appointment, but says 'Schedule appointment' — not 'Contact now'", () => {
    const lead = { status: "CONTACTED", firstResponseAt: new Date(), appointmentId: null };
    expect(requiresAction(lead)).toBe(true);
    expect(nextAction(lead)).toBe("Schedule appointment");
  });

  it("does not flag a CONTACTED lead that already has an appointment", () => {
    const lead = { status: "CONTACTED", firstResponseAt: new Date(), appointmentId: "appt-1" };
    expect(requiresAction(lead)).toBe(false);
  });

  it("suggests confirming the show once status has progressed to APPOINTMENT", () => {
    const lead = { status: "APPOINTMENT", firstResponseAt: new Date(), appointmentId: "appt-1" };
    expect(requiresAction(lead)).toBe(false);
    expect(nextAction(lead)).toBe("Confirm show");
  });

  it("suggests logging the outcome once a lead has SHOWED", () => {
    const lead = { status: "SHOWED", firstResponseAt: new Date(), appointmentId: "appt-1" };
    expect(nextAction(lead)).toBe("Log outcome");
  });
});

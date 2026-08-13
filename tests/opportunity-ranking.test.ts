import { describe, it, expect } from "vitest";
import { rankLeadOpportunities, type LeadForOpportunity } from "@/lib/opportunities";

describe("rankLeadOpportunities", () => {
  const now = new Date("2026-08-13T12:00:00Z");

  it("ranks unanswered NEW leads above stale CONTACTED leads", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "stale-1",
        status: "CONTACTED",
        createdAt: new Date("2026-08-05T12:00:00Z"), // 8 days old
        firstResponseAt: new Date("2026-08-05T13:00:00Z"),
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "Stale Lead",
      },
      {
        id: "new-1",
        status: "NEW",
        createdAt: new Date("2026-08-13T06:00:00Z"), // 6 hours old, unanswered
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "New Lead",
      },
    ];

    const ranked = rankLeadOpportunities(leads, now);
    expect(ranked[0].leadId).toBe("new-1");
    expect(ranked[0].category).toBe("URGENT_FOLLOWUP");
    expect(ranked[0].priority).toBe("DO_NOW");
  });

  it("does not flag a CONTACTED lead with an appointment as stale", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "has-appt",
        status: "CONTACTED",
        createdAt: new Date("2026-08-01T12:00:00Z"),
        firstResponseAt: new Date("2026-08-01T13:00:00Z"),
        appointmentId: "appt-1",
        interestType: null,
        assignedTo: null,
        customerName: "Has Appointment",
      },
    ];
    expect(rankLeadOpportunities(leads, now)).toHaveLength(0);
  });

  it("does not flag a fresh CONTACTED lead (under 3 days) as stale", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "fresh",
        status: "CONTACTED",
        createdAt: new Date("2026-08-12T12:00:00Z"), // 1 day old
        firstResponseAt: new Date("2026-08-12T13:00:00Z"),
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "Fresh Lead",
      },
    ];
    expect(rankLeadOpportunities(leads, now)).toHaveLength(0);
  });

  it("gives a higher score to a New RV interest than an unspecified one, all else equal", () => {
    const base = {
      status: "NEW",
      createdAt: new Date("2026-08-13T06:00:00Z"),
      firstResponseAt: null,
      appointmentId: null,
      assignedTo: null,
    };
    const leads: LeadForOpportunity[] = [
      { id: "plain", ...base, interestType: null, customerName: "Plain" },
      { id: "high-value", ...base, interestType: "New RV", customerName: "High Value" },
    ];
    const ranked = rankLeadOpportunities(leads, now);
    const plain = ranked.find((o) => o.leadId === "plain")!;
    const highValue = ranked.find((o) => o.leadId === "high-value")!;
    expect(highValue.score).toBeGreaterThan(plain.score);
  });

  it("uses the lead's assignedTo as owner, or UNASSIGNED when absent", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "owned",
        status: "NEW",
        createdAt: new Date("2026-08-13T06:00:00Z"),
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: "J. Ramirez",
        customerName: "Owned Lead",
      },
      {
        id: "unowned",
        status: "NEW",
        createdAt: new Date("2026-08-13T06:00:00Z"),
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "Unowned Lead",
      },
    ];
    const ranked = rankLeadOpportunities(leads, now);
    expect(ranked.find((o) => o.leadId === "owned")?.owner).toBe("J. Ramirez");
    expect(ranked.find((o) => o.leadId === "unowned")?.owner).toBe("UNASSIGNED");
  });

  it("never fabricates an estimated dollar effect — always UNKNOWN", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "new-1",
        status: "NEW",
        createdAt: new Date("2026-08-13T06:00:00Z"),
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "Lead",
      },
    ];
    const ranked = rankLeadOpportunities(leads, now);
    expect(ranked[0].estimatedEffect).toMatch(/^UNKNOWN/);
  });

  it("is sorted descending by score", () => {
    const leads: LeadForOpportunity[] = [
      {
        id: "old-unanswered",
        status: "NEW",
        createdAt: new Date("2026-08-01T12:00:00Z"),
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "Old",
      },
      {
        id: "new-unanswered",
        status: "NEW",
        createdAt: new Date("2026-08-13T10:00:00Z"),
        firstResponseAt: null,
        appointmentId: null,
        interestType: null,
        assignedTo: null,
        customerName: "New",
      },
    ];
    const ranked = rankLeadOpportunities(leads, now);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });
});

import { describe, it, expect } from "vitest";
import { computeCohortFunnel, rate, type LeadForCohort } from "@/lib/metrics";

// Regression test for the Phase 6 fix: a naive "shows / sales" ratio computed from two
// independently-counted tables can show a false 100% Show → Close rate when the person
// who showed and the person who bought are different people. This mirrors the seed
// fixture (Dana shows without buying; Priya buys without ever having an appointment).
describe("computeCohortFunnel", () => {
  it("does not credit an unrelated sale to a lead that showed but did not buy", () => {
    const leads: LeadForCohort[] = [
      // Dana: showed, did not buy.
      { status: "SHOWED", appointment: { showed: true }, sales: [] },
      // Priya: bought, but never had an appointment on file.
      { status: "SOLD_RO_OPENED", appointment: null, sales: [{}] },
    ];

    const counts = computeCohortFunnel(leads);

    expect(counts.leadsShowed).toBe(1);
    expect(counts.leadsSold).toBe(1);
    // The naive (independent-count) ratio would be sales(1) / shows(1) = 100%.
    // The cohort-correct rate must be 0%, since no lead both showed AND sold.
    expect(counts.leadsShowedAndSold).toBe(0);
    expect(rate(counts.leadsShowedAndSold, counts.leadsShowed)).toBe(0);
  });

  it("credits a show-to-sale conversion only when the same lead did both", () => {
    const leads: LeadForCohort[] = [
      { status: "SOLD_RO_OPENED", appointment: { showed: true }, sales: [{}] },
      { status: "SHOWED", appointment: { showed: true }, sales: [] },
    ];

    const counts = computeCohortFunnel(leads);

    expect(counts.leadsShowed).toBe(2);
    expect(counts.leadsShowedAndSold).toBe(1);
    expect(rate(counts.leadsShowedAndSold, counts.leadsShowed)).toBe(0.5);
  });

  it("returns null (DATA REQUIRED), not a divide-by-zero, when there are no shows", () => {
    const leads: LeadForCohort[] = [{ status: "NEW", appointment: null, sales: [] }];
    const counts = computeCohortFunnel(leads);
    expect(rate(counts.leadsShowedAndSold, counts.leadsShowed)).toBeNull();
  });

  it("counts qualified leads and appointment cohort independently of the show/sale cohort", () => {
    const leads: LeadForCohort[] = [
      { status: "ENGAGED", appointment: null, sales: [] },
      { status: "APPOINTMENT", appointment: { showed: null }, sales: [] },
      { status: "NEW", appointment: null, sales: [] },
    ];
    const counts = computeCohortFunnel(leads);
    expect(counts.totalLeads).toBe(3);
    expect(counts.qualifiedLeads).toBe(2);
    expect(counts.leadsWithAppointment).toBe(1);
    expect(counts.leadsShowed).toBe(0);
  });
});

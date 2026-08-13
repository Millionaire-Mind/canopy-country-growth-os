import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Everything created by this script is either:
//  (a) SAMPLE DATA — isSampleData: true, meant to be replaced by real CSV import or
//      integration, or
//  (b) real research findings about Canopy Country RV Center (business_facts /
//      authority_sources), each carrying an honest VERIFIED / NEEDS_VERIFICATION /
//      DO_NOT_PUBLISH status. See docs/BUSINESS_FACTS.md.
// No inventory, pricing, or financing figures are invented anywhere in this file.
//
// SAFETY: every delete below is scoped to `isSampleData: true`. This script must never
// be able to remove real dealership data (real leads, customers, sales, etc.) — running
// it repeatedly only resets the sample/demo fixtures, never real records. It also never
// touches the `users` table at all; staff accounts are managed exclusively via
// scripts/manage-users.ts.

if (process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_SEED_IN_PRODUCTION !== "true") {
  console.error(
    "Refused: NODE_ENV=production. Seeding demo/sample records into a production " +
      "database is not something this script does without an explicit override. If you " +
      "really intend this (e.g. a fresh production database you want demo data in " +
      "temporarily), set ALLOW_SAMPLE_SEED_IN_PRODUCTION=true."
  );
  process.exit(1);
}

async function main() {
  // Child tables first, respecting foreign keys — all scoped to isSampleData: true.
  await prisma.searchPerformance.deleteMany({ where: { isSampleData: true } });
  await prisma.webPage.deleteMany({ where: { isSampleData: true } });
  await prisma.lifecycleEvent.deleteMany({ where: { isSampleData: true } });
  await prisma.serviceOrder.deleteMany({ where: { isSampleData: true } });
  await prisma.sale.deleteMany({ where: { isSampleData: true } });
  await prisma.lead.deleteMany({ where: { isSampleData: true } });
  await prisma.appointment.deleteMany({ where: { isSampleData: true } });
  await prisma.rvOwnership.deleteMany({ where: { isSampleData: true } });
  await prisma.customer.deleteMany({ where: { isSampleData: true } });
  await prisma.campaign.deleteMany({ where: { isSampleData: true } });

  // business_facts / authority_sources are this script's own authored research content
  // (not dealership operational data — no isSampleData concept applies), so they're
  // fully re-synced on every run rather than filtered.
  await prisma.businessFact.deleteMany();
  await prisma.authoritySource.deleteMany();

  // ---------------------------------------------------------------------
  // Business facts (real research, honestly labeled — see docs/BUSINESS_FACTS.md)
  // ---------------------------------------------------------------------
  await prisma.businessFact.createMany({
    data: [
      {
        claim: "Business name",
        value: "Canopy Country RV Center",
        source: "Yelp, Facebook, RVUSA, Jayco dealer locator",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Founding year",
        value: "1974",
        source: "Project brief",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Address (active location)",
        value: "2904 Main St, Union Gap, WA 98903",
        source: "Yelp, YellowPages, RVUSA (3 independent listings agree)",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Phone",
        value: "(509) 248-7050",
        source: "Yelp",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Hours",
        value: "Mon-Fri 8:30am-5:00pm, Sat 9:00am-4:00pm, Sun Closed",
        source: "Yelp",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Ellensburg location active",
        value: "No — listed CLOSED on Yelp",
        source: "Yelp",
        status: "DO_NOT_PUBLISH",
      },
      {
        claim: "Authorized Jayco dealer",
        value: "Yes",
        source: "jayco.com/dealers/canopy-country-rv/",
        status: "VERIFIED",
      },
      {
        claim: "Brands carried (current)",
        value: "Forest River, Jayco, Keystone",
        source: "canopycountry.com brand pages (indexed), Jayco locator",
        status: "NEEDS_VERIFICATION",
      },
      {
        claim: "Brands carried (historical, likely stale)",
        value: "Alfa, Coachmen, Fleetwood, Kit, Nu-Wa, Skyline, Western RV",
        source: "Third-party aggregator summary",
        status: "DO_NOT_PUBLISH",
      },
      {
        claim: "Hitch installation / solar installation offered",
        value: "Unconfirmed",
        source: "Project brief keyword targets only, not independently confirmed",
        status: "NEEDS_VERIFICATION",
      },
    ],
  });

  await prisma.authoritySource.createMany({
    data: [
      {
        sourceName: "Jayco Dealer Locator",
        sourceType: "Manufacturer Locator",
        url: "https://www.jayco.com/dealers/canopy-country-rv/",
        claimSupported: "Authorized Jayco dealer status",
        verificationStatus: "VERIFIED",
      },
      {
        sourceName: "Yelp Business Listing",
        sourceType: "Review Platform",
        url: "https://www.yelp.com/biz/canopy-country-rv-center-yakima-union-gap",
        claimSupported: "Address, phone, hours",
        verificationStatus: "NEEDS_VERIFICATION",
      },
      {
        sourceName: "Facebook Business Page",
        sourceType: "Social Profile",
        url: "https://www.facebook.com/CanopyCountryRV.Yakima/",
        claimSupported: "Business existence, active operation",
        verificationStatus: "NEEDS_VERIFICATION",
      },
      {
        sourceName: "RVUSA Dealer Listing",
        sourceType: "Industry Directory",
        url: "https://www.rvusa.com/rv-dealers/canopy-country-rv-center-yakima-wa-98903-d608",
        claimSupported: "Business existence, location",
        verificationStatus: "NEEDS_VERIFICATION",
      },
      {
        sourceName: "Google Business Profile",
        sourceType: "Local Platform",
        url: null,
        claimSupported: "Address, phone, hours, categories (strongest available source)",
        verificationStatus: "NOT_YET_CHECKED",
      },
    ],
  });

  // ---------------------------------------------------------------------
  // SAMPLE DATA — customers, RVs, leads, appointments, sales, service orders.
  // Deliberately includes a cohort mismatch (Dana shows, Priya buys, unrelated) so the
  // funnel's cohort logic can be verified against a false-100%-conversion regression.
  // ---------------------------------------------------------------------
  const customers = await Promise.all(
    [
      { firstName: "Dana", lastName: "Whitfield", email: "dana.w@example.com", phone: "509-555-0142" },
      { firstName: "Marcus", lastName: "Ibarra", email: "marcus.ibarra@example.com", phone: "509-555-0198" },
      { firstName: "Priya", lastName: "Chandra", email: "priya.c@example.com", phone: "509-555-0170" },
      { firstName: "Wade", lastName: "Holcomb", email: "wade.h@example.com", phone: "509-555-0133" },
      { firstName: "Renee", lastName: "Sato", email: "renee.sato@example.com", phone: "509-555-0111" },
      { firstName: "Tobias", lastName: "Kemp", email: "tobias.kemp@example.com", phone: "509-555-0187" },
    ].map((c) => prisma.customer.create({ data: { ...c, isSampleData: true, communicationStatus: "OPT_IN" } }))
  );

  const [dana, marcus, priya, wade, renee, tobias] = customers;

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000);
  const daysFromNow = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);

  // Appointments (created first so leads can optionally reference one)
  const apptShown = await prisma.appointment.create({
    data: { department: "Sales", scheduledAt: daysAgo(5), showed: true, outcome: "Toured 2 units", isSampleData: true },
  });
  const apptUpcoming = await prisma.appointment.create({
    data: { department: "Service", scheduledAt: daysFromNow(2), showed: null, isSampleData: true },
  });
  const apptNoShow = await prisma.appointment.create({
    data: { department: "Sales", scheduledAt: daysAgo(10), showed: false, isSampleData: true },
  });

  // Leads — mix of statuses/sources to make the funnel and alerts meaningful.
  await prisma.lead.create({
    data: {
      customerId: tobias.id,
      createdAt: hoursAgo(30),
      source: "Google Organic",
      landingPage: "/used/",
      department: "Sales",
      interestType: "Used RV",
      status: "NEW",
      isSampleData: true,
    },
  });

  await prisma.lead.create({
    data: {
      customerId: renee.id,
      createdAt: daysAgo(12),
      firstResponseAt: daysAgo(11),
      lastContactAt: daysAgo(11),
      source: "Facebook",
      landingPage: "/all-inventory/",
      department: "Sales",
      interestType: "New RV",
      status: "CONTACTED",
      assignedTo: "J. Ramirez",
      isSampleData: true,
    },
  });

  // Dana SHOWED — but does NOT buy. This is the deliberate cohort-mismatch fixture:
  // without correct cohort logic, a naive sales-count / shows-count ratio would still
  // look like a "sale" happened for this show, when it didn't.
  await prisma.lead.create({
    data: {
      customerId: dana.id,
      createdAt: daysAgo(6),
      firstResponseAt: daysAgo(6),
      lastContactAt: daysAgo(5),
      source: "Google Organic",
      landingPage: "/brand/jayco/",
      department: "Sales",
      interestType: "New RV",
      status: "SHOWED",
      assignedTo: "J. Ramirez",
      appointmentId: apptShown.id,
      isSampleData: true,
    },
  });

  await prisma.lead.create({
    data: {
      customerId: marcus.id,
      createdAt: daysAgo(2),
      firstResponseAt: hoursAgo(46),
      lastContactAt: hoursAgo(46),
      source: "Direct",
      landingPage: "/service/",
      department: "Service",
      interestType: "Winterization",
      status: "APPOINTMENT",
      assignedTo: "Service Desk",
      appointmentId: apptUpcoming.id,
      isSampleData: true,
    },
  });

  await prisma.lead.create({
    data: {
      customerId: wade.id,
      createdAt: daysAgo(15),
      firstResponseAt: daysAgo(14),
      lastContactAt: daysAgo(14),
      source: "Paid Search",
      landingPage: "/all-inventory/",
      department: "Sales",
      interestType: "Trade Valuation",
      status: "LOST",
      lostReason: "No-show, unresponsive to follow-up",
      assignedTo: "J. Ramirez",
      appointmentId: apptNoShow.id,
      isSampleData: true,
    },
  });

  // Priya BUYS — but has no appointment/show on file at all (e.g. a referral who
  // negotiated by phone). Her sale must not be credited to Dana's show in the cohort
  // funnel just because both happened to exist in the same time window.
  const leadSold = await prisma.lead.create({
    data: {
      customerId: priya.id,
      createdAt: daysAgo(20),
      firstResponseAt: daysAgo(19),
      lastContactAt: daysAgo(3),
      source: "Referral",
      landingPage: "/brand/jay-feather/",
      department: "Sales",
      interestType: "New RV",
      status: "SOLD_RO_OPENED",
      assignedTo: "J. Ramirez",
      isSampleData: true,
    },
  });

  await prisma.sale.create({
    data: {
      customerId: priya.id,
      leadId: leadSold.id,
      saleDate: daysAgo(3),
      salePrice: 38500,
      frontGross: 4200,
      fiGross: 1100,
      totalGross: 5300,
      isSampleData: true,
    },
  });

  // RV ownership + service history + lifecycle events (Screen 5 foundation)
  const priyaRv = await prisma.rvOwnership.create({
    data: {
      customerId: priya.id,
      year: 2026,
      make: "Jayco",
      model: "Jay Feather",
      purchaseDate: daysAgo(3),
      purchaseSource: "Referral",
      warrantyEndDate: daysFromNow(365),
      isSampleData: true,
    },
  });

  const marcusRv = await prisma.rvOwnership.create({
    data: {
      customerId: marcus.id,
      year: 2019,
      make: "Forest River",
      model: "Rockwood",
      purchaseDate: daysAgo(900),
      purchaseSource: "Google Organic",
      warrantyEndDate: daysAgo(170),
      isSampleData: true,
    },
  });

  await prisma.serviceOrder.create({
    data: {
      customerId: marcus.id,
      rvId: marcusRv.id,
      openDate: daysAgo(200),
      closeDate: daysAgo(198),
      serviceCategory: "Roof Repair",
      revenue: 850,
      grossProfit: 340,
      isSampleData: true,
    },
  });

  await prisma.lifecycleEvent.createMany({
    data: [
      {
        customerId: priya.id,
        rvId: priyaRv.id,
        eventType: "30-Day Ownership Check",
        triggerDate: daysFromNow(27),
        status: "PENDING",
        recommendedAction: "Call to ask about questions/problems since delivery",
        isSampleData: true,
      },
      {
        customerId: marcus.id,
        rvId: marcusRv.id,
        eventType: "Winterization",
        triggerDate: daysFromNow(10),
        status: "ELIGIBLE",
        recommendedAction: "Send winterization scheduling reminder before first freeze",
        isSampleData: true,
      },
      {
        customerId: marcus.id,
        rvId: marcusRv.id,
        eventType: "Warranty Expired — Upgrade Opportunity",
        triggerDate: daysAgo(170),
        status: "PENDING",
        recommendedAction: "Offer trade valuation given 2019 model + expired warranty",
        isSampleData: true,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Campaign / opportunity queue (Screen 4) — illustrative examples straight from
  // the brief's own event-based-marketing examples, explicitly marked SAMPLE DATA.
  // ---------------------------------------------------------------------
  await prisma.campaign.createMany({
    data: [
      {
        name: "First Freeze Winterization Push",
        trigger: "First freezing weather forecast for Yakima Valley",
        audience: "Known RV owners without a winterization RO this season",
        offerMessage: "Schedule winterization before the first freeze",
        channel: "Email / SMS / Google Business Profile post",
        landingPage: "/service/",
        expectedOutcome: "Service appointments booked ahead of freeze risk",
        evidence: "Sample: 1 customer (Marcus) already flagged ELIGIBLE in lifecycle events",
        priority: "DO_NOW",
        measurementPlan: "Track service appointments booked from this campaign's link/promo code",
        isSampleData: true,
      },
      {
        name: "Aging Used RV Merchandising",
        trigger: "Used unit aging past normal turn time",
        audience: "Prior shoppers who viewed similar model/floorplan",
        offerMessage: "Model-specific merchandising highlighting price/availability",
        channel: "Email / social / retargeting",
        landingPage: "/used/",
        expectedOutcome: "Renewed inquiries on aging inventory",
        evidence: "Sample — requires DMS inventory-age data to identify real candidates",
        priority: "TEST",
        measurementPlan: "Leads and shows attributed to the specific inventory ID",
        isSampleData: true,
      },
    ],
  });

  console.log("Seed complete (sample/demo records only — real data, if any, untouched).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Mirrors docs/INTEGRATIONS.md. Kept as data (not hard-coded page markup) so the status
// list and the reasoning stay in one place and are easy to update as integrations land.

export type IntegrationStatus = "CONNECTED" | "IMPORT_ONLY" | "NOT_CONNECTED";

export interface IntegrationInfo {
  name: string;
  status: IntegrationStatus;
  missingData: string;
  whyItMatters: string;
  accessRequired: string;
  csvFallback: string;
}

export const INTEGRATIONS: IntegrationInfo[] = [
  {
    name: "GA4",
    status: "NOT_CONNECTED",
    missingData: "Visitor counts, session source/medium, landing page, on-site behavior",
    whyItMatters: "Needed for Visitor→Lead conversion rate and true funnel top-of-funnel",
    accessRequired: "Viewer access on the GA4 property, or a service account with Analytics Data API access",
    csvFallback: "No — not a clean recurring export for trend analysis",
  },
  {
    name: "Google Search Console",
    status: "IMPORT_ONLY",
    missingData: "Live/recurring sync — each load is a manual point-in-time export",
    whyItMatters: "Needed for Screen 3 — which searches actually produce opportunities",
    accessRequired: "User access on the verified canopycountry.com property",
    csvFallback: "Yes — built (Search & Demand Capture → Import Search Console CSV)",
  },
  {
    name: "Google Business Profile",
    status: "NOT_CONNECTED",
    missingData: "Views, calls, direction requests, Q&A, review volume",
    whyItMatters: "Primary local/near-me demand-capture channel",
    accessRequired: "Manager access on the GBP listing",
    csvFallback: "No",
  },
  {
    name: "CRM",
    status: "IMPORT_ONLY",
    missingData: "Live lead sync, response-time automation",
    whyItMatters: "Core of Engine 2 (lead recovery) — response time and follow-up tracking",
    accessRequired: "API credentials for the CRM in use, or a recurring lead export",
    csvFallback: "Yes — built (Lead Command Center → Import CSV)",
  },
  {
    name: "DMS",
    status: "NOT_CONNECTED",
    missingData: "Sale price, front/F&I gross, repair-order revenue and gross profit",
    whyItMatters: "Needed for every gross-profit and CAC calculation in Engine 1",
    accessRequired: "DMS vendor export/report feature, or API credentials",
    csvFallback: "Planned — same CSV pattern as leads, not built yet",
  },
  {
    name: "Call Tracking",
    status: "NOT_CONNECTED",
    missingData: "Which calls came from which source/campaign",
    whyItMatters: "Phone is a major RV-buyer channel; without it, phone leads attribute to UNKNOWN",
    accessRequired: "API key from a call-tracking vendor (none confirmed in use)",
    csvFallback: "No",
  },
  {
    name: "Website Leads",
    status: "NOT_CONNECTED",
    missingData: "Real-time structured lead capture at submission time",
    whyItMatters: "Enables the immediate-acknowledgment, response-timer workflow in Engine 2",
    accessRequired: "A webhook pointing form submissions at POST /api/leads",
    csvFallback: "Yes, interim — periodic export from the current form tool",
  },
];

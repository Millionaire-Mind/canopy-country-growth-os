// Evidence-driven content queue (Screen 6). Static data, not a DB table, per the brief's
// minimum data model (no content_opportunities entity was requested). These are drafted
// topic ideas derived from the brief's own business-line priorities and the sample
// service-order data — they are proposals, not published claims, and each states plainly
// whether original dealership evidence exists yet.

export interface ContentOpportunity {
  customerQuestion: string;
  businessLine: string;
  searchOpportunity: string;
  socialOpportunity: string;
  originalEvidenceAvailable: "YES" | "NOT YET" | "NEEDS CONFIRMATION";
  revenueConnection: string;
  targetAudience: string;
  sourceAsset: string;
  repurposing: string;
  cta: string;
  measurement: string;
}

export const CONTENT_OPPORTUNITIES: ContentOpportunity[] = [
  {
    customerQuestion: "What actually breaks on RVs before camping season in Yakima?",
    businessLine: "Service",
    searchOpportunity: "RV winterization Yakima, RV de-winterization Yakima, RV roof repair Yakima",
    socialOpportunity: "Short-form walkthrough of a real de-winterization inspection",
    originalEvidenceAvailable: "NOT YET",
    revenueConnection: "Service appointments, roof/seal repair ROs",
    targetAudience: "Existing owners approaching camping season",
    sourceAsset: "One filmed service-bay walkthrough",
    repurposing: "Website article, YouTube, GBP post, email to owners nearing warranty end",
    cta: "Schedule RV Service",
    measurement: "Service appointments booked from /service/ in the 2 weeks after publish",
  },
  {
    customerQuestion: "What does our team actually check when evaluating a used travel trailer?",
    businessLine: "Used/Trade",
    searchOpportunity: "used travel trailers Yakima, RV trade in Yakima",
    socialOpportunity: "Behind-the-scenes trade-in inspection video",
    originalEvidenceAvailable: "NOT YET",
    revenueConnection: "Trade-in leads, used inventory leads",
    targetAudience: "Current owners considering a trade, used-RV shoppers",
    sourceAsset: "One filmed trade evaluation",
    repurposing: "Website article, Instagram/TikTok clips, sales-enablement one-pager",
    cta: "Value My Trade",
    measurement: "Trade-valuation form submissions attributed to the page",
  },
  {
    customerQuestion: "Which travel trailer actually fits a couple vs. a family of five?",
    businessLine: "New/Inventory",
    searchOpportunity: "travel trailers Yakima, floorplan comparison searches, model-specific searches",
    socialOpportunity: "Floorplan walkthrough comparing two real units on the lot",
    originalEvidenceAvailable: "NOT YET",
    revenueConnection: "New RV sales leads",
    targetAudience: "First-time buyers, families sizing a floorplan",
    sourceAsset: "One filmed floorplan walkthrough pair",
    repurposing: "Website article, YouTube, Facebook/Instagram, GBP post",
    cta: "Ask About This RV",
    measurement: "Inventory inquiry leads on the compared models",
  },
];

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "communicationStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "medium" TEXT,
    "campaign" TEXT,
    "landingPage" TEXT,
    "department" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "interestType" TEXT,
    "inventoryId" TEXT,
    "assignedTo" TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "appointmentId" TEXT,
    "outcome" TEXT,
    "lostReason" TEXT,
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "showed" BOOLEAN,
    "outcome" TEXT,
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "leadId" TEXT,
    "inventoryId" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salePrice" DECIMAL(10,2),
    "frontGross" DECIMAL(10,2),
    "fiGross" DECIMAL(10,2),
    "totalGross" DECIMAL(10,2),
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rvId" TEXT,
    "openDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" TIMESTAMP(3),
    "serviceCategory" TEXT NOT NULL,
    "revenue" DECIMAL(10,2),
    "grossProfit" DECIMAL(10,2),
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rv_ownership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseSource" TEXT,
    "warrantyEndDate" TIMESTAMP(3),
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rv_ownership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "offerMessage" TEXT,
    "channel" TEXT NOT NULL,
    "landingPage" TEXT,
    "expectedOutcome" TEXT,
    "evidence" TEXT,
    "priority" TEXT,
    "measurementPlan" TEXT,
    "startDate" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "leads" INTEGER NOT NULL DEFAULT 0,
    "appointments" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2),
    "grossProfit" DECIMAL(10,2),
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_pages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "businessLine" TEXT NOT NULL,
    "primaryIntent" TEXT,
    "targetGeography" TEXT,
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "web_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_performance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "pageId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "position" DOUBLE PRECISION,
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "search_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lifecycle_events" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rvId" TEXT,
    "eventType" TEXT NOT NULL,
    "triggerDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recommendedAction" TEXT,
    "isSampleData" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_facts" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "business_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authority_sources" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "url" TEXT,
    "claimSupported" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL,

    CONSTRAINT "authority_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_appointmentId_key" ON "leads"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "web_pages_url_key" ON "web_pages"("url");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_rvId_fkey" FOREIGN KEY ("rvId") REFERENCES "rv_ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rv_ownership" ADD CONSTRAINT "rv_ownership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_performance" ADD CONSTRAINT "search_performance_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "web_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_events_rvId_fkey" FOREIGN KEY ("rvId") REFERENCES "rv_ownership"("id") ON DELETE SET NULL ON UPDATE CASCADE;


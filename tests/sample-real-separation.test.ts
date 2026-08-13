import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";

// Integration test for Phase 2 (protect real data from seed/reset) — runs the actual
// prisma/seed.ts script (not a re-implementation of it) against a real database and
// asserts a pre-existing "real" (isSampleData: false) record survives re-seeding while
// sample records get refreshed. Skipped when no DATABASE_URL is configured (e.g. a CI
// job that doesn't provision Postgres) rather than failing on missing infrastructure.
const hasDb = !!process.env.DATABASE_URL;

describe.skipIf(!hasDb)("seed.ts sample/real separation", () => {
  const prisma = new PrismaClient();
  let realCustomerId: string;
  let realLeadId: string;

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { id: realLeadId } });
    await prisma.customer.deleteMany({ where: { id: realCustomerId } });
    await prisma.$disconnect();
  });

  it("preserves a real lead/customer across a reseed and still refreshes sample data", async () => {
    const realCustomer = await prisma.customer.create({
      data: {
        firstName: "Integration",
        lastName: "TestReal",
        email: `real-${Date.now()}@example.com`,
        isSampleData: false,
      },
    });
    realCustomerId = realCustomer.id;

    const realLead = await prisma.lead.create({
      data: {
        customerId: realCustomer.id,
        source: "Direct",
        department: "Sales",
        status: "NEW",
        isSampleData: false,
      },
    });
    realLeadId = realLead.id;

    execSync("npx tsx prisma/seed.ts", {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
    });

    const survivingLead = await prisma.lead.findUnique({ where: { id: realLeadId } });
    const survivingCustomer = await prisma.customer.findUnique({ where: { id: realCustomerId } });
    expect(survivingLead).not.toBeNull();
    expect(survivingCustomer).not.toBeNull();
    expect(survivingLead?.isSampleData).toBe(false);

    const sampleLeadCount = await prisma.lead.count({ where: { isSampleData: true } });
    expect(sampleLeadCount).toBeGreaterThan(0);
  }, 30000);
});

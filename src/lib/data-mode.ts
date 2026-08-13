import { prisma } from "@/lib/db";

// Whether any sample/demo records are still present in the operational tables. Used to
// make the SAMPLE DATA banner conditional — it should disappear once a dealership's real
// data has fully replaced the seeded demo data, not stay pinned on screen forever.
export async function hasSampleData(): Promise<boolean> {
  const [leads, customers, sales, appointments] = await Promise.all([
    prisma.lead.count({ where: { isSampleData: true } }),
    prisma.customer.count({ where: { isSampleData: true } }),
    prisma.sale.count({ where: { isSampleData: true } }),
    prisma.appointment.count({ where: { isSampleData: true } }),
  ]);
  return leads > 0 || customers > 0 || sales > 0 || appointments > 0;
}

// Ports the browser-demo mock data (src/lib/mock-data.ts) into real rows for
// one seeded tenant, so the deployed app has the same rich demo content to
// click through — now durable in Postgres instead of localStorage.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  COMPANY_NAME,
  defaultSettings,
  users,
  customers,
  catalog,
  quotes,
  jobs,
  jobTasks,
  timeEntries,
  callLogs,
} from "../src/lib/mock-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "IroncladDemo!1";

async function main() {
  console.log(`Seeding tenant "${COMPANY_NAME}"...`);

  const tenant = await prisma.tenant.create({ data: { name: COMPANY_NAME } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIdMap = new Map<string, string>();
  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        title: u.title,
        phone: u.phone,
        color: u.color,
      },
    });
    userIdMap.set(u.id, created.id);
  }

  const customerIdMap = new Map<string, string>();
  for (const c of customers) {
    const created = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        email: c.email,
      },
    });
    customerIdMap.set(c.id, created.id);
  }

  const catalogIdMap = new Map<string, string>();
  for (const item of catalog) {
    const created = await prisma.catalogItem.create({
      data: {
        tenantId: tenant.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        price: item.price,
        vendor: item.vendor,
        description: item.description,
      },
    });
    catalogIdMap.set(item.id, created.id);
  }

  const quoteIdMap = new Map<string, string>();
  for (const q of quotes) {
    const created = await prisma.quote.create({
      data: {
        tenantId: tenant.id,
        title: q.title,
        customerId: customerIdMap.get(q.customerId)!,
        status: q.status,
        createdAt: q.createdAt,
        laborRate: q.laborRate,
        markupPercent: q.markupPercent,
        taxPercent: q.taxPercent,
        lineItems: {
          create: q.lineItems.map((li) => ({
            name: li.name,
            category: li.category,
            unit: li.unit,
            quantity: li.quantity,
            materialCost: li.materialCost,
            laborHours: li.laborHours,
            catalogItemId: li.catalogId ? catalogIdMap.get(li.catalogId) : null,
          })),
        },
      },
    });
    quoteIdMap.set(q.id, created.id);
  }

  const jobIdMap = new Map<string, string>();
  for (const j of jobs) {
    const created = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        title: j.title,
        customerId: customerIdMap.get(j.customerId)!,
        status: j.status,
        scheduledDate: j.scheduledDate,
        notes: j.notes,
        quoteId: j.quoteId ? quoteIdMap.get(j.quoteId) : null,
        assignedEmployees: {
          connect: j.assignedEmployeeIds.map((id) => ({ id: userIdMap.get(id)! })),
        },
      },
    });
    jobIdMap.set(j.id, created.id);
  }

  const taskIdMap = new Map<string, string>();
  for (const t of jobTasks) {
    const created = await prisma.jobTask.create({
      data: {
        tenantId: tenant.id,
        jobId: jobIdMap.get(t.jobId)!,
        title: t.title,
        status: t.status,
        order: t.order,
        estimatedMinutes: t.estimatedMinutes,
        assignedEmployeeId: t.assignedEmployeeId ? userIdMap.get(t.assignedEmployeeId) : null,
        completedAt: t.completedAt,
      },
    });
    taskIdMap.set(t.id, created.id);
  }

  for (const t of timeEntries) {
    await prisma.timeEntry.create({
      data: {
        tenantId: tenant.id,
        employeeId: userIdMap.get(t.employeeId)!,
        jobId: t.jobId ? jobIdMap.get(t.jobId) : null,
        taskId: t.taskId ? taskIdMap.get(t.taskId) : null,
        date: t.date,
        clockIn: new Date(t.clockIn),
        clockOut: t.clockOut ? new Date(t.clockOut) : null,
      },
    });
  }

  for (const c of callLogs) {
    await prisma.callLog.create({
      data: {
        tenantId: tenant.id,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        channel: c.channel,
        startedAt: new Date(c.startedAt),
        durationSec: c.durationSec,
        outcome: c.outcome,
        summary: c.summary,
        transcript: JSON.parse(JSON.stringify(c.transcript)),
      },
    });
  }

  await prisma.companySettings.create({
    data: {
      tenantId: tenant.id,
      companyName: defaultSettings.companyName,
      address: defaultSettings.address,
      supportEmail: defaultSettings.supportEmail,
      defaultLaborRate: defaultSettings.defaultLaborRate,
      defaultMarkupPercent: defaultSettings.defaultMarkupPercent,
      defaultTaxPercent: defaultSettings.defaultTaxPercent,
      businessType: defaultSettings.businessType,
      aiGreeting: defaultSettings.aiGreeting,
      aiHandoffRule: defaultSettings.aiHandoffRule,
      openRouterModel: defaultSettings.openRouterModel,
    },
  });

  console.log("\nSeeded successfully. Demo logins (all share one password):\n");
  for (const u of users) {
    console.log(`  ${u.email}  (${u.role})`);
  }
  console.log(`\n  password: ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

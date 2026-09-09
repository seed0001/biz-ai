import "server-only";
import { prisma } from "./prisma";
import type {
  CallLog,
  CatalogItem,
  CompanySettings,
  Customer,
  Job,
  JobTask,
  Quote,
  TimeEntry,
  User,
} from "./types";

export interface TenantSnapshot {
  users: User[];
  customers: Customer[];
  jobs: Job[];
  quotes: Quote[];
  catalog: CatalogItem[];
  jobTasks: JobTask[];
  timeEntries: TimeEntry[];
  callLogs: CallLog[];
  settings: CompanySettings;
}

// Fetches everything for one tenant in the shape the client store expects —
// the same shape mock-data.ts used to seed, now sourced from Postgres. Used
// once per page load from the root layout (a Server Component) to hydrate
// the client-side AppProvider.
export async function getTenantSnapshot(tenantId: string): Promise<TenantSnapshot> {
  const [users, customers, jobsRaw, quotesRaw, catalog, jobTasksRaw, timeEntriesRaw, callLogsRaw, settings] =
    await Promise.all([
      prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      prisma.customer.findMany({ where: { tenantId } }),
      prisma.job.findMany({ where: { tenantId }, include: { assignedEmployees: { select: { id: true } } } }),
      prisma.quote.findMany({ where: { tenantId }, include: { lineItems: true } }),
      prisma.catalogItem.findMany({ where: { tenantId } }),
      prisma.jobTask.findMany({ where: { tenantId } }),
      prisma.timeEntry.findMany({ where: { tenantId } }),
      prisma.callLog.findMany({ where: { tenantId } }),
      prisma.companySettings.findUnique({ where: { tenantId } }),
    ]);

  if (!settings) {
    throw new Error(`Tenant ${tenantId} has no CompanySettings row`);
  }

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      title: u.title,
      phone: u.phone,
      email: u.email,
      color: u.color,
    })),
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      phone: c.phone,
      email: c.email,
    })),
    jobs: jobsRaw.map((j) => ({
      id: j.id,
      title: j.title,
      customerId: j.customerId,
      status: j.status,
      scheduledDate: j.scheduledDate,
      assignedEmployeeIds: j.assignedEmployees.map((e) => e.id),
      quoteId: j.quoteId ?? undefined,
      notes: j.notes,
    })),
    quotes: quotesRaw.map((q) => ({
      id: q.id,
      title: q.title,
      customerId: q.customerId,
      status: q.status,
      createdAt: q.createdAt,
      lineItems: q.lineItems.map((li) => ({
        id: li.id,
        name: li.name,
        category: li.category,
        unit: li.unit,
        quantity: li.quantity,
        materialCost: li.materialCost,
        laborHours: li.laborHours,
        catalogId: li.catalogItemId ?? undefined,
      })),
      laborRate: q.laborRate ?? undefined,
      markupPercent: q.markupPercent ?? undefined,
      taxPercent: q.taxPercent ?? undefined,
    })),
    catalog: catalog.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      unit: c.unit,
      price: c.price,
      vendor: c.vendor,
      description: c.description,
    })),
    jobTasks: jobTasksRaw.map((t) => ({
      id: t.id,
      jobId: t.jobId,
      title: t.title,
      status: t.status,
      order: t.order,
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      assignedEmployeeId: t.assignedEmployeeId,
      completedAt: t.completedAt ?? undefined,
    })),
    timeEntries: timeEntriesRaw.map((t) => ({
      id: t.id,
      employeeId: t.employeeId,
      jobId: t.jobId,
      taskId: t.taskId,
      date: t.date,
      clockIn: t.clockIn.toISOString(),
      clockOut: t.clockOut ? t.clockOut.toISOString() : null,
    })),
    callLogs: callLogsRaw.map((c) => ({
      id: c.id,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      channel: c.channel,
      startedAt: c.startedAt.toISOString(),
      durationSec: c.durationSec,
      outcome: c.outcome,
      summary: c.summary,
      transcript: c.transcript as { from: "ai" | "customer"; text: string }[],
    })),
    settings: {
      companyName: settings.companyName,
      address: settings.address,
      supportEmail: settings.supportEmail,
      defaultLaborRate: settings.defaultLaborRate,
      defaultMarkupPercent: settings.defaultMarkupPercent,
      defaultTaxPercent: settings.defaultTaxPercent,
      businessType: settings.businessType,
      aiGreeting: settings.aiGreeting,
      aiHandoffRule: settings.aiHandoffRule,
      openRouterModel: settings.openRouterModel,
    },
  };
}

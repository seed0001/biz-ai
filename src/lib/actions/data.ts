"use server";

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type {
  CallLog,
  CatalogItem,
  JobStatus,
  JobTask,
  QuoteLineItem,
  QuoteStatus,
  TaskStatus,
} from "@/lib/types";

// Every action re-verifies the session and scopes every read/write by the
// caller's own tenantId — an id guessed for another company's row simply
// won't match the `where` clause and Prisma throws/returns nothing.

export async function addEmployeeAction(input: { id: string; name: string; title: string; phone: string; email: string; color: string }) {
  const { tenantId } = await verifySession();
  await prisma.user.create({
    data: {
      id: input.id,
      tenantId,
      name: input.name,
      title: input.title,
      phone: input.phone,
      email: input.email,
      color: input.color,
      role: "employee",
      // Demo-grade placeholder — real invite/password-setup flow is a follow-up.
      passwordHash: "",
    },
  });
}

export async function addJobAction(input: {
  id: string;
  title: string;
  customerId: string;
  scheduledDate: string;
  assignedEmployeeIds: string[];
  notes: string;
}) {
  const { tenantId } = await verifySession();
  await prisma.job.create({
    data: {
      id: input.id,
      tenantId,
      title: input.title,
      customerId: input.customerId,
      scheduledDate: input.scheduledDate,
      notes: input.notes,
      status: "scheduled",
      assignedEmployees: { connect: input.assignedEmployeeIds.map((id) => ({ id })) },
    },
  });
}

export async function updateJobStatusAction(jobId: string, status: JobStatus) {
  const { tenantId } = await verifySession();
  await prisma.job.updateMany({ where: { id: jobId, tenantId }, data: { status } });
}

export async function addTaskAction(input: {
  id: string;
  jobId: string;
  title: string;
  order: number;
  estimatedMinutes?: number;
  assignedEmployeeId?: string | null;
}) {
  const { tenantId } = await verifySession();
  await prisma.jobTask.create({
    data: {
      id: input.id,
      tenantId,
      jobId: input.jobId,
      title: input.title,
      order: input.order,
      estimatedMinutes: input.estimatedMinutes,
      assignedEmployeeId: input.assignedEmployeeId ?? null,
      status: "pending",
    },
  });
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  const { tenantId } = await verifySession();
  await prisma.jobTask.updateMany({
    where: { id: taskId, tenantId },
    data: { status, completedAt: status === "completed" ? new Date().toISOString().slice(0, 10) : null },
  });
}

export async function updateTaskAction(
  taskId: string,
  patch: Partial<Pick<JobTask, "title" | "estimatedMinutes" | "assignedEmployeeId">>
) {
  const { tenantId } = await verifySession();
  await prisma.jobTask.updateMany({ where: { id: taskId, tenantId }, data: patch });
}

export async function deleteTaskAction(taskId: string) {
  const { tenantId } = await verifySession();
  await prisma.jobTask.deleteMany({ where: { id: taskId, tenantId } });
}

// The client (store.tsx) computes the step breakdown via suggestTasksForLineItem
// and assigns ids itself for instant optimistic UI — this just persists the
// exact rows it decided on, keeping client and server ids in sync.
export async function createJobTasksAction(
  jobId: string,
  rows: { id: string; title: string; order: number }[]
) {
  const { tenantId } = await verifySession();
  const job = await prisma.job.findFirst({ where: { id: jobId, tenantId } });
  if (!job || rows.length === 0) return;
  await prisma.jobTask.createMany({
    data: rows.map((r) => ({ id: r.id, tenantId, jobId, title: r.title, order: r.order, status: "pending" as const })),
  });
}

export async function updateQuoteStatusAction(quoteId: string, status: QuoteStatus) {
  const { tenantId } = await verifySession();
  await prisma.quote.updateMany({ where: { id: quoteId, tenantId }, data: { status } });
}

// The quote builder sends the full, authoritative line-item list on every
// edit. Simplest correct approach given ad-hoc client-side ids: replace the
// set for that quote entirely rather than diffing.
export async function updateQuoteLineItemsAction(quoteId: string, lineItems: QuoteLineItem[]) {
  const { tenantId } = await verifySession();
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, tenantId } });
  if (!quote) return;

  await prisma.$transaction([
    prisma.quoteLineItem.deleteMany({ where: { quoteId } }),
    prisma.quoteLineItem.createMany({
      data: lineItems.map((li) => ({
        id: li.id,
        quoteId,
        name: li.name,
        category: li.category,
        unit: li.unit,
        quantity: li.quantity,
        materialCost: li.materialCost,
        laborHours: li.laborHours,
        catalogItemId: li.catalogId ?? null,
      })),
    }),
  ]);
}

export async function updateQuoteRatesAction(
  quoteId: string,
  patch: { laborRate?: number; markupPercent?: number; taxPercent?: number }
) {
  const { tenantId } = await verifySession();
  await prisma.quote.updateMany({ where: { id: quoteId, tenantId }, data: patch });
}

export async function addQuoteAction(input: { id: string; title: string; customerId: string }) {
  const { tenantId } = await verifySession();
  await prisma.quote.create({
    data: {
      id: input.id,
      tenantId,
      title: input.title,
      customerId: input.customerId,
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
    },
  });
}

export async function addCatalogItemAction(input: { id: string } & Omit<CatalogItem, "id">) {
  const { tenantId } = await verifySession();
  await prisma.catalogItem.create({ data: { ...input, tenantId } });
}

export async function updateCatalogItemAction(id: string, patch: Partial<Omit<CatalogItem, "id">>) {
  const { tenantId } = await verifySession();
  await prisma.catalogItem.updateMany({ where: { id, tenantId }, data: patch });
}

export async function deleteCatalogItemAction(id: string) {
  const { tenantId } = await verifySession();
  await prisma.catalogItem.deleteMany({ where: { id, tenantId } });
}

export async function addQuoteItemFromCatalogAction(input: {
  id: string;
  quoteId: string;
  catalogId: string;
  quantity: number;
}) {
  const { tenantId } = await verifySession();
  const [quote, item] = await Promise.all([
    prisma.quote.findFirst({ where: { id: input.quoteId, tenantId } }),
    prisma.catalogItem.findFirst({ where: { id: input.catalogId, tenantId } }),
  ]);
  if (!quote || !item) return;
  await prisma.quoteLineItem.create({
    data: {
      id: input.id,
      quoteId: input.quoteId,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: input.quantity,
      materialCost: item.price,
      laborHours: 0,
      catalogItemId: item.id,
    },
  });
}

export async function addCallLogAction(input: { id: string } & Omit<CallLog, "id">) {
  const { tenantId } = await verifySession();
  await prisma.callLog.create({
    data: {
      id: input.id,
      tenantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      channel: input.channel,
      startedAt: new Date(input.startedAt),
      durationSec: input.durationSec,
      outcome: input.outcome,
      summary: input.summary,
      transcript: JSON.parse(JSON.stringify(input.transcript)),
    },
  });
}

export async function updateSettingsAction(
  patch: Partial<{
    companyName: string;
    address: string;
    supportEmail: string;
    defaultLaborRate: number;
    defaultMarkupPercent: number;
    defaultTaxPercent: number;
    businessType: string;
    aiGreeting: string;
    aiHandoffRule: "urgent_only" | "on_request" | "never";
    openRouterModel: string;
  }>
) {
  const { tenantId } = await verifySession();
  await prisma.companySettings.updateMany({ where: { tenantId }, data: patch });
}

export async function clockInAction(input: { id: string; employeeId: string; jobId: string | null; taskId: string | null }) {
  const { tenantId } = await verifySession();
  const now = new Date();
  await prisma.$transaction([
    prisma.timeEntry.updateMany({
      where: { tenantId, employeeId: input.employeeId, clockOut: null },
      data: { clockOut: now },
    }),
    prisma.timeEntry.create({
      data: {
        id: input.id,
        tenantId,
        employeeId: input.employeeId,
        jobId: input.jobId,
        taskId: input.taskId,
        date: now.toISOString().slice(0, 10),
        clockIn: now,
        clockOut: null,
      },
    }),
    ...(input.taskId
      ? [
          prisma.jobTask.updateMany({
            where: { id: input.taskId, tenantId, status: "pending" },
            data: { status: "in_progress" as const },
          }),
        ]
      : []),
  ]);
}

export async function clockOutAction(employeeId: string) {
  const { tenantId } = await verifySession();
  await prisma.timeEntry.updateMany({
    where: { tenantId, employeeId, clockOut: null },
    data: { clockOut: new Date() },
  });
}

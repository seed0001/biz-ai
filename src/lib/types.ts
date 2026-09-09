export type Role = "owner" | "employee";

export interface User {
  id: string;
  name: string;
  role: Role;
  title: string;
  phone: string;
  email: string;
  color: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export type JobStatus =
  | "quoted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "invoiced";

export interface Job {
  id: string;
  title: string;
  customerId: string;
  status: JobStatus;
  scheduledDate: string; // ISO date
  assignedEmployeeIds: string[];
  quoteId?: string;
  notes: string;
}

// The granular checklist of steps needed to actually execute a job — distinct
// from a quote's line items (which group cost/pricing, not sequence of work).
// A trim & paint quote might have one "labor" line item, but the task list
// breaks that into prep, fill nail holes, caulk, prime, coat 1, coat 2, cleanup.
export type TaskStatus = "pending" | "in_progress" | "completed";

export interface JobTask {
  id: string;
  jobId: string;
  title: string;
  status: TaskStatus;
  order: number;
  estimatedMinutes?: number;
  assignedEmployeeId?: string | null;
  completedAt?: string; // ISO date stamped when status transitions to "completed" — drives analytics
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "declined";

// A line item splits cost into material $ and labor hours rather than a
// single unit price, so the company-wide labor rate/markup/tax (see
// CompanySettings) can be applied consistently across every quote.
export interface QuoteLineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  materialCost: number; // unit price of materials/goods for one unit
  laborHours: number; // labor hours required per unit
  catalogId?: string; // when set, materialCost/name/unit/category are sourced from that catalog item
}

export interface Quote {
  id: string;
  title: string;
  customerId: string;
  status: QuoteStatus;
  createdAt: string;
  lineItems: QuoteLineItem[];
  jobId?: string;
  // Per-quote overrides of the company defaults in CompanySettings.
  laborRate?: number;
  markupPercent?: number;
  taxPercent?: number;
}

// A reusable priced product/service/material. Line items can reference one
// via catalogId so the catalog stays the single source of truth for pricing.
export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  vendor: string;
  description: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  supportEmail: string;
  defaultLaborRate: number;
  defaultMarkupPercent: number;
  defaultTaxPercent: number;
  // Steers tone/assumptions for both the quoting assistant and the AI phone/text line.
  businessType: string;
  aiGreeting: string;
  aiHandoffRule: "urgent_only" | "on_request" | "never";
  // OpenRouter model id (see https://openrouter.ai/models) used by the AI assistant.
  openRouterModel: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  jobId: string | null;
  taskId: string | null;
  date: string; // ISO date
  clockIn: string; // ISO datetime
  clockOut: string | null; // ISO datetime
}

export type CallChannel = "call" | "text";
export type CallOutcome = "booked" | "message_taken" | "escalated" | "missed";

export interface TranscriptLine {
  from: "ai" | "customer";
  text: string;
}

export interface CallLog {
  id: string;
  customerName: string;
  customerPhone: string;
  channel: CallChannel;
  startedAt: string; // ISO datetime
  durationSec: number;
  outcome: CallOutcome;
  summary: string;
  transcript: TranscriptLine[];
}

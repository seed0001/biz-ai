import type { CallOutcome, CompanySettings, JobStatus, Quote, QuoteLineItem, QuoteStatus } from "./types";

export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Client-facing price for a single line: material + labor (at the shop rate)
// for one unit, marked up, times quantity. Mirrors how the grand total is
// built so the per-line numbers always foot to the quote total below.
export function lineItemTotal(item: QuoteLineItem, laborRate: number, markupPercent: number): number {
  const direct = item.materialCost + item.laborHours * laborRate;
  return direct * (1 + markupPercent / 100) * item.quantity;
}

export interface QuoteTotals {
  materials: number;
  laborHours: number;
  laborCost: number;
  directCost: number;
  markupAmount: number;
  taxAmount: number;
  total: number;
}

// Ports the pricing model from quote-ai: materials and labor (hours * shop
// rate) are summed, marked up as a whole, then tax is applied to materials
// only (labor is typically not taxed). A quote can override the company's
// default labor rate / markup / tax per job.
export function calculateQuoteTotals(quote: Quote, settings: CompanySettings): QuoteTotals {
  const laborRate = quote.laborRate ?? settings.defaultLaborRate;
  const markupPercent = quote.markupPercent ?? settings.defaultMarkupPercent;
  const taxPercent = quote.taxPercent ?? settings.defaultTaxPercent;

  let materials = 0;
  let laborHours = 0;
  for (const item of quote.lineItems) {
    materials += item.materialCost * item.quantity;
    laborHours += item.laborHours * item.quantity;
  }

  const laborCost = laborHours * laborRate;
  const directCost = materials + laborCost;
  const markupAmount = directCost * (markupPercent / 100);
  const taxAmount = materials * (taxPercent / 100);
  const total = directCost + markupAmount + taxAmount;

  return { materials, laborHours, laborCost, directCost, markupAmount, taxAmount, total };
}

export function formatDate(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  quoted: "Quoted",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  invoiced: "Invoiced",
};

export const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  quoted: "bg-slate-100 text-slate-700 ring-slate-600/20",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-amber-50 text-amber-700 ring-amber-600/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  invoiced: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const QUOTE_STATUS_STYLE: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-slate-600/20",
  sent: "bg-blue-50 text-blue-700 ring-blue-600/20",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  declined: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  booked: "Booked",
  message_taken: "Message taken",
  escalated: "Escalated",
  missed: "Missed",
};

export const CALL_OUTCOME_STYLE: Record<CallOutcome, string> = {
  booked: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  message_taken: "bg-blue-50 text-blue-700 ring-blue-600/20",
  escalated: "bg-rose-50 text-rose-700 ring-rose-600/20",
  missed: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

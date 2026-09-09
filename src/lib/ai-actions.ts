import type {
  CallLog,
  CatalogItem,
  JobStatus,
  QuoteLineItem,
  QuoteStatus,
} from "./types";

// The contract for everything an AI agent (the quoting assistant today, the
// phone/text front desk later) is allowed to do to the business's data.
// Modeled after quote-ai's action-schema approach: the model never writes to
// state directly — it emits one of these typed actions, applyAiAction()
// validates it against the live data, and only then dispatches it through
// the same store methods the UI itself uses. An action referencing a record
// that doesn't exist (a bad catalogId, a made-up customerId) is rejected
// before it can corrupt anything.

export type AiAction =
  | { type: "CREATE_CATALOG_ITEM"; payload: Omit<CatalogItem, "id"> }
  | { type: "UPDATE_CATALOG_ITEM"; payload: { id: string } & Partial<Omit<CatalogItem, "id">> }
  | { type: "DELETE_CATALOG_ITEM"; payload: { id: string } }
  | { type: "CREATE_QUOTE"; payload: { title: string; customerId: string } }
  | {
      type: "ADD_QUOTE_ITEM";
      // catalogId is preferred whenever the material/product exists in the
      // catalog — the catalog's price is authoritative, never a model guess.
      payload: {
        quoteId: string;
        catalogId?: string;
        quantity?: number;
        name?: string;
        category?: string;
        unit?: string;
        materialCost?: number;
        laborHours?: number;
      };
    }
  | { type: "UPDATE_QUOTE_STATUS"; payload: { quoteId: string; status: QuoteStatus } }
  | {
      type: "CREATE_JOB";
      payload: {
        title: string;
        customerId: string;
        scheduledDate: string;
        assignedEmployeeIds?: string[];
        notes?: string;
      };
    }
  | { type: "UPDATE_JOB_STATUS"; payload: { jobId: string; status: JobStatus } }
  // The step-by-step checklist for actually executing a job (distinct from
  // a quote's line items, which are cost groupings, not sequence of work).
  | {
      type: "CREATE_JOB_TASK";
      payload: { jobId: string; title: string; estimatedMinutes?: number; assignedEmployeeId?: string };
    }
  // The phone/text AI agent logs every call or text it handles this way.
  | { type: "LOG_CALL"; payload: Omit<CallLog, "id"> }
  | { type: "CLOCK_IN"; payload: { employeeId: string; jobId?: string | null } }
  | { type: "CLOCK_OUT"; payload: { employeeId: string } };

export const AI_ACTION_TYPES = [
  "CREATE_CATALOG_ITEM",
  "UPDATE_CATALOG_ITEM",
  "DELETE_CATALOG_ITEM",
  "CREATE_QUOTE",
  "ADD_QUOTE_ITEM",
  "UPDATE_QUOTE_STATUS",
  "CREATE_JOB",
  "UPDATE_JOB_STATUS",
  "CREATE_JOB_TASK",
  "LOG_CALL",
  "CLOCK_IN",
  "CLOCK_OUT",
] as const;

// The slice of app state/actions applyAiAction needs. Deliberately a plain
// structural type (not imported from store.tsx) so this module has no
// dependency on the store implementation — only on the shapes it reads from
// and the methods it calls.
export interface AiActionContext {
  catalog: CatalogItem[];
  customers: { id: string }[];
  quotes: { id: string; lineItems: QuoteLineItem[] }[];
  jobs: { id: string }[];
  users: { id: string }[];

  addCatalogItem: (input: Omit<CatalogItem, "id">) => string;
  updateCatalogItem: (id: string, patch: Partial<Omit<CatalogItem, "id">>) => void;
  deleteCatalogItem: (id: string) => void;
  addQuote: (input: { title: string; customerId: string }) => string;
  addQuoteItemFromCatalog: (quoteId: string, catalogId: string, quantity?: number) => void;
  updateQuoteLineItems: (quoteId: string, lineItems: QuoteLineItem[]) => void;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  addJob: (input: {
    title: string;
    customerId: string;
    scheduledDate: string;
    assignedEmployeeIds: string[];
    notes: string;
  }) => string;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  addTask: (
    jobId: string,
    input: { title: string; estimatedMinutes?: number; assignedEmployeeId?: string | null }
  ) => string;
  addCallLog: (input: Omit<CallLog, "id">) => string;
  clockIn: (employeeId: string, jobId: string | null) => void;
  clockOut: (employeeId: string) => void;
}

// Fed into the system prompt so the model knows exactly what it's allowed to
// emit and in what shape. Kept as one string (rather than derived from the
// TS types, which don't exist at runtime) — update it alongside AiAction.
export const AI_ACTION_SCHEMA_PROMPT = `Available actions (respond with a JSON array of these; empty array if none apply):
- { "type": "CREATE_CATALOG_ITEM", "payload": { "name": string, "category": string, "unit": string, "price": number, "vendor": string, "description": string } }
- { "type": "UPDATE_CATALOG_ITEM", "payload": { "id": string, ...any fields above to change } }
- { "type": "DELETE_CATALOG_ITEM", "payload": { "id": string } }
- { "type": "CREATE_QUOTE", "payload": { "title": string, "customerId": string } }
- { "type": "ADD_QUOTE_ITEM", "payload": { "quoteId": string, "catalogId": string (preferred whenever the item exists in the catalog — its price is authoritative), "quantity": number, "name": string, "category": string, "unit": string, "materialCost": number, "laborHours": number } } — omit catalogId only for a one-off item with no catalog match.
- { "type": "UPDATE_QUOTE_STATUS", "payload": { "quoteId": string, "status": "draft"|"sent"|"accepted"|"declined" } }
- { "type": "CREATE_JOB", "payload": { "title": string, "customerId": string, "scheduledDate": "YYYY-MM-DD", "assignedEmployeeIds": string[], "notes": string } }
- { "type": "UPDATE_JOB_STATUS", "payload": { "jobId": string, "status": "quoted"|"scheduled"|"in_progress"|"completed"|"invoiced" } }
- { "type": "CREATE_JOB_TASK", "payload": { "jobId": string, "title": string, "estimatedMinutes": number, "assignedEmployeeId": string } } — one concrete step of work on that job (e.g. "Fill nail holes & caulk gaps"), not a cost line item.
- { "type": "LOG_CALL", "payload": { "customerName": string, "customerPhone": string, "channel": "call"|"text", "startedAt": ISO datetime string, "durationSec": number, "outcome": "booked"|"message_taken"|"escalated"|"missed", "summary": string, "transcript": [{ "from": "ai"|"customer", "text": string }] } }
- { "type": "CLOCK_IN", "payload": { "employeeId": string, "jobId": string|null } }
- { "type": "CLOCK_OUT", "payload": { "employeeId": string } }

Rules:
1. Only reference ids (customerId, catalogId, quoteId, jobId, employeeId) that appear in the provided context. Never invent one.
2. If the request is ambiguous or missing required information, return an empty actions array and ask a clarifying question in "reply" instead.
3. Prefer catalogId over a manual materialCost whenever a matching catalog item exists.`;

export interface AiActionResult {
  ok: boolean;
  message: string;
}

function fail(message: string): AiActionResult {
  return { ok: false, message };
}

function ok(message: string): AiActionResult {
  return { ok: true, message };
}

const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted", "declined"];
const JOB_STATUSES: JobStatus[] = ["quoted", "scheduled", "in_progress", "completed", "invoiced"];
const CALL_CHANNELS = ["call", "text"];
const CALL_OUTCOMES = ["booked", "message_taken", "escalated", "missed"];

function isOneOf<T extends string>(value: unknown, allowed: T[]): value is T {
  return typeof value === "string" && (allowed as string[]).includes(value);
}

// The deterministic validation gate: every reference an action makes to an
// existing record is checked against live data before anything is applied.
export function applyAiAction(ctx: AiActionContext, action: AiAction): AiActionResult {
  if (!(AI_ACTION_TYPES as readonly string[]).includes(action?.type)) {
    return fail(`Unrecognized action type: ${JSON.stringify(action?.type)}`);
  }

  switch (action.type) {
    case "CREATE_CATALOG_ITEM": {
      if (!action.payload.name?.trim()) return fail("Catalog item needs a name.");
      const id = ctx.addCatalogItem(action.payload);
      return ok(`Added "${action.payload.name}" to the catalog (${id}).`);
    }

    case "UPDATE_CATALOG_ITEM": {
      const exists = ctx.catalog.some((c) => c.id === action.payload.id);
      if (!exists) return fail(`No catalog item with id ${action.payload.id}.`);
      const { id, ...patch } = action.payload;
      ctx.updateCatalogItem(id, patch);
      return ok(`Updated catalog item ${id}.`);
    }

    case "DELETE_CATALOG_ITEM": {
      const exists = ctx.catalog.some((c) => c.id === action.payload.id);
      if (!exists) return fail(`No catalog item with id ${action.payload.id}.`);
      ctx.deleteCatalogItem(action.payload.id);
      return ok(`Removed catalog item ${action.payload.id}.`);
    }

    case "CREATE_QUOTE": {
      if (!ctx.customers.some((c) => c.id === action.payload.customerId)) {
        return fail(`No customer with id ${action.payload.customerId}.`);
      }
      const id = ctx.addQuote(action.payload);
      return ok(`Created draft quote "${action.payload.title}" (${id}).`);
    }

    case "ADD_QUOTE_ITEM": {
      const { quoteId, catalogId, quantity } = action.payload;
      if (!ctx.quotes.some((q) => q.id === quoteId)) return fail(`No quote with id ${quoteId}.`);
      if (catalogId) {
        if (!ctx.catalog.some((c) => c.id === catalogId)) {
          return fail(`No catalog item with id ${catalogId}.`);
        }
        ctx.addQuoteItemFromCatalog(quoteId, catalogId, quantity ?? 1);
        return ok(`Added catalog item ${catalogId} to quote ${quoteId}.`);
      }
      if (!action.payload.name) return fail("Manual quote items need a name (or a catalogId).");
      const quote = ctx.quotes.find((q) => q.id === quoteId)!;
      const newItem: QuoteLineItem = {
        id: `li-${Date.now()}`,
        name: action.payload.name,
        category: action.payload.category || "Other",
        unit: action.payload.unit || "each",
        quantity: quantity ?? 1,
        materialCost: action.payload.materialCost ?? 0,
        laborHours: action.payload.laborHours ?? 0,
      };
      ctx.updateQuoteLineItems(quoteId, [...quote.lineItems, newItem]);
      return ok(`Added "${newItem.name}" to quote ${quoteId}.`);
    }

    case "UPDATE_QUOTE_STATUS": {
      if (!ctx.quotes.some((q) => q.id === action.payload.quoteId)) {
        return fail(`No quote with id ${action.payload.quoteId}.`);
      }
      if (!isOneOf(action.payload.status, QUOTE_STATUSES)) {
        return fail(`Invalid quote status: ${JSON.stringify(action.payload.status)}.`);
      }
      ctx.updateQuoteStatus(action.payload.quoteId, action.payload.status);
      return ok(`Marked quote ${action.payload.quoteId} as ${action.payload.status}.`);
    }

    case "CREATE_JOB": {
      if (!action.payload.title?.trim()) return fail("Job needs a title.");
      if (!ctx.customers.some((c) => c.id === action.payload.customerId)) {
        return fail(`No customer with id ${action.payload.customerId}.`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.payload.scheduledDate || "")) {
        return fail(`scheduledDate must be YYYY-MM-DD, got ${JSON.stringify(action.payload.scheduledDate)}.`);
      }
      const id = ctx.addJob({
        title: action.payload.title,
        customerId: action.payload.customerId,
        scheduledDate: action.payload.scheduledDate,
        assignedEmployeeIds: (action.payload.assignedEmployeeIds ?? []).filter((eid) =>
          ctx.users.some((u) => u.id === eid)
        ),
        notes: action.payload.notes ?? "",
      });
      return ok(`Created job "${action.payload.title}" (${id}).`);
    }

    case "UPDATE_JOB_STATUS": {
      if (!ctx.jobs.some((j) => j.id === action.payload.jobId)) {
        return fail(`No job with id ${action.payload.jobId}.`);
      }
      if (!isOneOf(action.payload.status, JOB_STATUSES)) {
        return fail(`Invalid job status: ${JSON.stringify(action.payload.status)}.`);
      }
      ctx.updateJobStatus(action.payload.jobId, action.payload.status);
      return ok(`Marked job ${action.payload.jobId} as ${action.payload.status}.`);
    }

    case "CREATE_JOB_TASK": {
      if (!ctx.jobs.some((j) => j.id === action.payload.jobId)) {
        return fail(`No job with id ${action.payload.jobId}.`);
      }
      if (!action.payload.title?.trim()) return fail("Task needs a title.");
      if (action.payload.assignedEmployeeId && !ctx.users.some((u) => u.id === action.payload.assignedEmployeeId)) {
        return fail(`No employee with id ${action.payload.assignedEmployeeId}.`);
      }
      const id = ctx.addTask(action.payload.jobId, {
        title: action.payload.title,
        estimatedMinutes: action.payload.estimatedMinutes,
        assignedEmployeeId: action.payload.assignedEmployeeId ?? null,
      });
      return ok(`Added task "${action.payload.title}" to job ${action.payload.jobId} (${id}).`);
    }

    case "LOG_CALL": {
      const p = action.payload;
      if (!p.customerName?.trim()) return fail("Call log needs a customerName.");
      if (!isOneOf(p.channel, CALL_CHANNELS)) return fail(`Invalid call channel: ${JSON.stringify(p.channel)}.`);
      if (!isOneOf(p.outcome, CALL_OUTCOMES)) return fail(`Invalid call outcome: ${JSON.stringify(p.outcome)}.`);
      const id = ctx.addCallLog({
        customerName: p.customerName,
        customerPhone: p.customerPhone ?? "",
        channel: p.channel,
        startedAt: p.startedAt || new Date().toISOString(),
        durationSec: typeof p.durationSec === "number" ? p.durationSec : 0,
        outcome: p.outcome,
        summary: p.summary ?? "",
        transcript: Array.isArray(p.transcript) ? p.transcript : [],
      });
      return ok(`Logged ${p.channel} from ${p.customerName} (${id}).`);
    }

    case "CLOCK_IN": {
      if (!ctx.users.some((u) => u.id === action.payload.employeeId)) {
        return fail(`No employee with id ${action.payload.employeeId}.`);
      }
      ctx.clockIn(action.payload.employeeId, action.payload.jobId ?? null);
      return ok(`Clocked in ${action.payload.employeeId}.`);
    }

    case "CLOCK_OUT": {
      if (!ctx.users.some((u) => u.id === action.payload.employeeId)) {
        return fail(`No employee with id ${action.payload.employeeId}.`);
      }
      ctx.clockOut(action.payload.employeeId);
      return ok(`Clocked out ${action.payload.employeeId}.`);
    }

    default: {
      const exhaustiveCheck: never = action;
      return fail(`Unknown action type: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

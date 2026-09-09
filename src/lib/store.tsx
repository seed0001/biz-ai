"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type {
  User,
  JobStatus,
  JobTask,
  TaskStatus,
  Quote,
  QuoteLineItem,
  QuoteStatus,
  TimeEntry,
  CallLog,
  CatalogItem,
  CompanySettings,
} from "./types";
import type { TenantSnapshot } from "./tenant-data";
import { suggestTasksForLineItem } from "./task-templates";
import { applyAiAction, type AiAction, type AiActionResult } from "./ai-actions";
import * as actions from "./actions/data";

const EMPLOYEE_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

interface AppContextValue extends TenantSnapshot {
  currentUser: User;
  clockIn: (employeeId: string, jobId: string | null, taskId?: string | null) => void;
  clockOut: (employeeId: string) => void;
  addTask: (
    jobId: string,
    input: { title: string; estimatedMinutes?: number; assignedEmployeeId?: string | null }
  ) => string;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTask: (
    taskId: string,
    patch: Partial<Pick<JobTask, "title" | "estimatedMinutes" | "assignedEmployeeId">>
  ) => void;
  deleteTask: (taskId: string) => void;
  generateTasksFromQuote: (jobId: string, quoteId: string) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  addEmployee: (input: { name: string; title: string; phone: string; email: string }) => void;
  addJob: (input: {
    title: string;
    customerId: string;
    scheduledDate: string;
    assignedEmployeeIds: string[];
    notes: string;
  }) => string;
  updateQuoteStatus: (quoteId: string, status: QuoteStatus) => void;
  updateQuoteLineItems: (quoteId: string, lineItems: QuoteLineItem[]) => void;
  updateQuoteRates: (
    quoteId: string,
    patch: Partial<Pick<Quote, "laborRate" | "markupPercent" | "taxPercent">>
  ) => void;
  addQuote: (input: { title: string; customerId: string }) => string;
  addCatalogItem: (input: Omit<CatalogItem, "id">) => string;
  updateCatalogItem: (id: string, patch: Partial<Omit<CatalogItem, "id">>) => void;
  deleteCatalogItem: (id: string) => void;
  addQuoteItemFromCatalog: (quoteId: string, catalogId: string, quantity?: number) => void;
  addCallLog: (input: Omit<CallLog, "id">) => string;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  runAiAction: (action: AiAction) => AiActionResult;
}

const AppContext = createContext<AppContextValue | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function AppProvider({
  initialData,
  currentUserId,
  children,
}: {
  initialData: TenantSnapshot;
  currentUserId: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<TenantSnapshot>(initialData);
  const lineItemTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === currentUserId) ?? state.users[0],
    [state.users, currentUserId]
  );

  const clockIn = useCallback((employeeId: string, jobId: string | null, taskId: string | null = null) => {
    const id = newId();
    const now = new Date().toISOString();
    setState((s) => {
      const timeEntries: TimeEntry[] = [
        ...s.timeEntries.map((t) =>
          t.employeeId === employeeId && t.clockOut === null ? { ...t, clockOut: now } : t
        ),
        { id, employeeId, jobId, taskId, date: now.slice(0, 10), clockIn: now, clockOut: null },
      ];
      const jobTasks = taskId
        ? s.jobTasks.map((task) =>
            task.id === taskId && task.status === "pending" ? { ...task, status: "in_progress" as TaskStatus } : task
          )
        : s.jobTasks;
      return { ...s, timeEntries, jobTasks };
    });
    actions.clockInAction({ id, employeeId, jobId, taskId }).catch(console.error);
  }, []);

  const clockOut = useCallback((employeeId: string) => {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      timeEntries: s.timeEntries.map((t) =>
        t.employeeId === employeeId && t.clockOut === null ? { ...t, clockOut: now } : t
      ),
    }));
    actions.clockOutAction(employeeId).catch(console.error);
  }, []);

  const addTask = useCallback(
    (jobId: string, input: { title: string; estimatedMinutes?: number; assignedEmployeeId?: string | null }) => {
      const id = newId();
      setState((s) => {
        const order = s.jobTasks.filter((t) => t.jobId === jobId).length;
        return {
          ...s,
          jobTasks: [
            ...s.jobTasks,
            {
              id,
              jobId,
              status: "pending",
              order,
              title: input.title,
              estimatedMinutes: input.estimatedMinutes,
              assignedEmployeeId: input.assignedEmployeeId ?? null,
            },
          ],
        };
      });
      const order = state.jobTasks.filter((t) => t.jobId === jobId).length;
      actions
        .addTaskAction({
          id,
          jobId,
          title: input.title,
          order,
          estimatedMinutes: input.estimatedMinutes,
          assignedEmployeeId: input.assignedEmployeeId,
        })
        .catch(console.error);
      return id;
    },
    [state.jobTasks]
  );

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setState((s) => ({
      ...s,
      jobTasks: s.jobTasks.map((t) =>
        t.id === taskId
          ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString().slice(0, 10) : undefined }
          : t
      ),
    }));
    actions.updateTaskStatusAction(taskId, status).catch(console.error);
  }, []);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Pick<JobTask, "title" | "estimatedMinutes" | "assignedEmployeeId">>) => {
      setState((s) => ({
        ...s,
        jobTasks: s.jobTasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
      actions.updateTaskAction(taskId, patch).catch(console.error);
    },
    []
  );

  const deleteTask = useCallback((taskId: string) => {
    setState((s) => ({ ...s, jobTasks: s.jobTasks.filter((t) => t.id !== taskId) }));
    actions.deleteTaskAction(taskId).catch(console.error);
  }, []);

  const generateTasksFromQuote = useCallback(
    (jobId: string, quoteId: string) => {
      const quote = state.quotes.find((q) => q.id === quoteId);
      if (!quote) return;
      let order = state.jobTasks.filter((t) => t.jobId === jobId).length;
      const newTasks: JobTask[] = [];
      quote.lineItems
        .filter((item) => item.laborHours > 0)
        .forEach((item) => {
          suggestTasksForLineItem(item).forEach((title) => {
            newTasks.push({ id: newId(), jobId, title, status: "pending", order: order++, assignedEmployeeId: null });
          });
        });
      if (newTasks.length === 0) return;
      setState((s) => ({ ...s, jobTasks: [...s.jobTasks, ...newTasks] }));
      actions
        .createJobTasksAction(
          jobId,
          newTasks.map((t) => ({ id: t.id, title: t.title, order: t.order }))
        )
        .catch(console.error);
    },
    [state.quotes, state.jobTasks]
  );

  const updateJobStatus = useCallback((jobId: string, status: JobStatus) => {
    setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)) }));
    actions.updateJobStatusAction(jobId, status).catch(console.error);
  }, []);

  const addEmployee = useCallback(
    (input: { name: string; title: string; phone: string; email: string }) => {
      const id = newId();
      setState((s) => {
        const color = EMPLOYEE_COLORS[s.users.length % EMPLOYEE_COLORS.length];
        return {
          ...s,
          users: [...s.users, { id, role: "employee", color, ...input }],
        };
      });
      const color = EMPLOYEE_COLORS[state.users.length % EMPLOYEE_COLORS.length];
      actions.addEmployeeAction({ id, color, ...input }).catch(console.error);
    },
    [state.users.length]
  );

  const addJob = useCallback(
    (input: {
      title: string;
      customerId: string;
      scheduledDate: string;
      assignedEmployeeIds: string[];
      notes: string;
    }) => {
      const id = newId();
      setState((s) => ({ ...s, jobs: [...s.jobs, { id, status: "scheduled", ...input }] }));
      actions.addJobAction({ id, ...input }).catch(console.error);
      return id;
    },
    []
  );

  const updateQuoteStatus = useCallback((quoteId: string, status: QuoteStatus) => {
    setState((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status } : q)) }));
    actions.updateQuoteStatusAction(quoteId, status).catch(console.error);
  }, []);

  const updateQuoteLineItems = useCallback((quoteId: string, lineItems: QuoteLineItem[]) => {
    setState((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, lineItems } : q)) }));
    // Debounced: this fires on every keystroke in the line-item table, so
    // batch rapid edits into one persist instead of a write per character.
    const timers = lineItemTimers.current;
    clearTimeout(timers.get(quoteId));
    timers.set(
      quoteId,
      setTimeout(() => {
        actions.updateQuoteLineItemsAction(quoteId, lineItems).catch(console.error);
      }, 600)
    );
  }, []);

  const updateQuoteRates = useCallback(
    (quoteId: string, patch: Partial<Pick<Quote, "laborRate" | "markupPercent" | "taxPercent">>) => {
      setState((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, ...patch } : q)) }));
      actions.updateQuoteRatesAction(quoteId, patch).catch(console.error);
    },
    []
  );

  const addQuote = useCallback((input: { title: string; customerId: string }) => {
    const id = newId();
    setState((s) => ({
      ...s,
      quotes: [
        ...s.quotes,
        { id, title: input.title, customerId: input.customerId, status: "draft", createdAt: new Date().toISOString().slice(0, 10), lineItems: [] },
      ],
    }));
    actions.addQuoteAction({ id, ...input }).catch(console.error);
    return id;
  }, []);

  const addCatalogItem = useCallback((input: Omit<CatalogItem, "id">) => {
    const id = newId();
    setState((s) => ({ ...s, catalog: [...s.catalog, { id, ...input }] }));
    actions.addCatalogItemAction({ id, ...input }).catch(console.error);
    return id;
  }, []);

  const updateCatalogItem = useCallback((id: string, patch: Partial<Omit<CatalogItem, "id">>) => {
    setState((s) => ({ ...s, catalog: s.catalog.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    actions.updateCatalogItemAction(id, patch).catch(console.error);
  }, []);

  const deleteCatalogItem = useCallback((id: string) => {
    setState((s) => ({ ...s, catalog: s.catalog.filter((c) => c.id !== id) }));
    actions.deleteCatalogItemAction(id).catch(console.error);
  }, []);

  const addQuoteItemFromCatalog = useCallback(
    (quoteId: string, catalogId: string, quantity = 1) => {
      const id = newId();
      setState((s) => {
        const item = s.catalog.find((c) => c.id === catalogId);
        if (!item) return s;
        const newLine: QuoteLineItem = {
          id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          quantity,
          materialCost: item.price,
          laborHours: 0,
          catalogId: item.id,
        };
        return {
          ...s,
          quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, lineItems: [...q.lineItems, newLine] } : q)),
        };
      });
      actions.addQuoteItemFromCatalogAction({ id, quoteId, catalogId, quantity }).catch(console.error);
    },
    []
  );

  const addCallLog = useCallback((input: Omit<CallLog, "id">) => {
    const id = newId();
    setState((s) => ({ ...s, callLogs: [{ id, ...input }, ...s.callLogs] }));
    actions.addCallLogAction({ id, ...input }).catch(console.error);
    return id;
  }, []);

  const updateSettings = useCallback((patch: Partial<CompanySettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    actions.updateSettingsAction(patch).catch(console.error);
  }, []);

  const runAiAction = useCallback(
    (action: AiAction) =>
      applyAiAction(
        {
          catalog: state.catalog,
          customers: state.customers,
          quotes: state.quotes,
          jobs: state.jobs,
          users: state.users,
          addCatalogItem,
          updateCatalogItem,
          deleteCatalogItem,
          addQuote,
          addQuoteItemFromCatalog,
          updateQuoteLineItems,
          updateQuoteStatus,
          addJob,
          updateJobStatus,
          addCallLog,
          clockIn,
          clockOut,
          addTask,
        },
        action
      ),
    [
      state,
      addCatalogItem,
      updateCatalogItem,
      deleteCatalogItem,
      addQuote,
      addQuoteItemFromCatalog,
      updateQuoteLineItems,
      updateQuoteStatus,
      addJob,
      updateJobStatus,
      addCallLog,
      clockIn,
      clockOut,
      addTask,
    ]
  );

  const value: AppContextValue = {
    ...state,
    currentUser,
    clockIn,
    clockOut,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    generateTasksFromQuote,
    updateJobStatus,
    addEmployee,
    addJob,
    updateQuoteStatus,
    updateQuoteLineItems,
    updateQuoteRates,
    addQuote,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    addQuoteItemFromCatalog,
    addCallLog,
    updateSettings,
    runAiAction,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

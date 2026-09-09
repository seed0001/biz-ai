"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  users as seedUsers,
  customers as seedCustomers,
  jobs as seedJobs,
  quotes as seedQuotes,
  timeEntries as seedTimeEntries,
  callLogs as seedCallLogs,
  catalog as seedCatalog,
  jobTasks as seedJobTasks,
  defaultSettings,
} from "./mock-data";
import type {
  User,
  Customer,
  Job,
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
import { suggestTasksForLineItem } from "./task-templates";
import { applyAiAction, type AiAction, type AiActionResult } from "./ai-actions";

interface AppState {
  users: User[];
  customers: Customer[];
  jobs: Job[];
  quotes: Quote[];
  timeEntries: TimeEntry[];
  callLogs: CallLog[];
  catalog: CatalogItem[];
  jobTasks: JobTask[];
  settings: CompanySettings;
  currentUserId: string;
}

const STORAGE_KEY = "biz-ai-demo-state-v4";

function loadInitialState(): AppState {
  return {
    users: seedUsers,
    customers: seedCustomers,
    jobs: seedJobs,
    quotes: seedQuotes,
    timeEntries: seedTimeEntries,
    callLogs: seedCallLogs,
    catalog: seedCatalog,
    jobTasks: seedJobTasks,
    settings: defaultSettings,
    currentUserId: seedUsers[0].id,
  };
}

interface AppContextValue extends AppState {
  currentUser: User;
  setCurrentUserId: (id: string) => void;
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
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadInitialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState(JSON.parse(raw));
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state, hydrated]);

  const setCurrentUserId = useCallback((id: string) => {
    setState((s) => ({ ...s, currentUserId: id }));
  }, []);

  const clockIn = useCallback((employeeId: string, jobId: string | null, taskId: string | null = null) => {
    setState((s) => {
      const now = new Date().toISOString();
      // Only one active timer per employee — starting a new one closes
      // whatever they were previously clocked into.
      const timeEntries = [
        ...s.timeEntries.map((t) =>
          t.employeeId === employeeId && t.clockOut === null ? { ...t, clockOut: now } : t
        ),
        {
          id: `t-${Date.now()}`,
          employeeId,
          jobId,
          taskId,
          date: now.slice(0, 10),
          clockIn: now,
          clockOut: null,
        },
      ];
      const jobTasks = taskId
        ? s.jobTasks.map((task) =>
            task.id === taskId && task.status === "pending" ? { ...task, status: "in_progress" as TaskStatus } : task
          )
        : s.jobTasks;
      return { ...s, timeEntries, jobTasks };
    });
  }, []);

  const clockOut = useCallback((employeeId: string) => {
    setState((s) => ({
      ...s,
      timeEntries: s.timeEntries.map((t) =>
        t.employeeId === employeeId && t.clockOut === null
          ? { ...t, clockOut: new Date().toISOString() }
          : t
      ),
    }));
  }, []);

  const updateJobStatus = useCallback((jobId: string, status: JobStatus) => {
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    }));
  }, []);

  const addTask = useCallback(
    (jobId: string, input: { title: string; estimatedMinutes?: number; assignedEmployeeId?: string | null }) => {
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
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
      return id;
    },
    []
  );

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setState((s) => ({
      ...s,
      jobTasks: s.jobTasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedAt: status === "completed" ? new Date().toISOString().slice(0, 10) : undefined,
            }
          : t
      ),
    }));
  }, []);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Pick<JobTask, "title" | "estimatedMinutes" | "assignedEmployeeId">>) => {
      setState((s) => ({
        ...s,
        jobTasks: s.jobTasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
      }));
    },
    []
  );

  const deleteTask = useCallback((taskId: string) => {
    setState((s) => ({ ...s, jobTasks: s.jobTasks.filter((t) => t.id !== taskId) }));
  }, []);

  // Expands each labor line item on the linked quote into its default step
  // checklist (see task-templates.ts). Material line items are cost, not
  // steps, so they're skipped.
  const generateTasksFromQuote = useCallback((jobId: string, quoteId: string) => {
    setState((s) => {
      const quote = s.quotes.find((q) => q.id === quoteId);
      if (!quote) return s;
      let order = s.jobTasks.filter((t) => t.jobId === jobId).length;
      const newTasks: JobTask[] = [];
      quote.lineItems
        .filter((item) => item.laborHours > 0)
        .forEach((item) => {
          suggestTasksForLineItem(item).forEach((title) => {
            newTasks.push({
              id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              jobId,
              title,
              status: "pending",
              order: order++,
              assignedEmployeeId: null,
            });
          });
        });
      return { ...s, jobTasks: [...s.jobTasks, ...newTasks] };
    });
  }, []);

  const addEmployee = useCallback(
    (input: { name: string; title: string; phone: string; email: string }) => {
      setState((s) => ({
        ...s,
        users: [
          ...s.users,
          {
            id: `u-${Date.now()}`,
            role: "employee",
            color: COLORS[s.users.length % COLORS.length],
            ...input,
          },
        ],
      }));
    },
    []
  );

  const addJob = useCallback(
    (input: {
      title: string;
      customerId: string;
      scheduledDate: string;
      assignedEmployeeIds: string[];
      notes: string;
    }) => {
      const id = `j-${Date.now()}`;
      setState((s) => ({
        ...s,
        jobs: [
          ...s.jobs,
          {
            id,
            status: "scheduled",
            ...input,
          },
        ],
      }));
      return id;
    },
    []
  );

  const updateQuoteStatus = useCallback((quoteId: string, status: QuoteStatus) => {
    setState((s) => ({
      ...s,
      quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status } : q)),
    }));
  }, []);

  const updateQuoteLineItems = useCallback(
    (quoteId: string, lineItems: QuoteLineItem[]) => {
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, lineItems } : q)),
      }));
    },
    []
  );

  const updateQuoteRates = useCallback(
    (quoteId: string, patch: Partial<Pick<Quote, "laborRate" | "markupPercent" | "taxPercent">>) => {
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, ...patch } : q)),
      }));
    },
    []
  );

  const addQuote = useCallback((input: { title: string; customerId: string }) => {
    const id = `q-${Date.now()}`;
    setState((s) => ({
      ...s,
      quotes: [
        ...s.quotes,
        {
          id,
          title: input.title,
          customerId: input.customerId,
          status: "draft",
          createdAt: new Date().toISOString().slice(0, 10),
          lineItems: [],
        },
      ],
    }));
    return id;
  }, []);

  const addCatalogItem = useCallback((input: Omit<CatalogItem, "id">) => {
    const id = `cat-${Date.now()}`;
    setState((s) => ({ ...s, catalog: [...s.catalog, { id, ...input }] }));
    return id;
  }, []);

  const updateCatalogItem = useCallback(
    (id: string, patch: Partial<Omit<CatalogItem, "id">>) => {
      setState((s) => ({
        ...s,
        catalog: s.catalog.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    []
  );

  const deleteCatalogItem = useCallback((id: string) => {
    setState((s) => ({ ...s, catalog: s.catalog.filter((c) => c.id !== id) }));
  }, []);

  // Mirrors quote-ai's ADD_QUOTE_ITEM-with-catalogId action: the catalog stays
  // the authoritative source for name/unit/category/price on that line.
  const addQuoteItemFromCatalog = useCallback(
    (quoteId: string, catalogId: string, quantity = 1) => {
      setState((s) => {
        const item = s.catalog.find((c) => c.id === catalogId);
        if (!item) return s;
        const newLine: QuoteLineItem = {
          id: `li-${Date.now()}`,
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
          quotes: s.quotes.map((q) =>
            q.id === quoteId ? { ...q, lineItems: [...q.lineItems, newLine] } : q
          ),
        };
      });
    },
    []
  );

  const updateSettings = useCallback((patch: Partial<CompanySettings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const addCallLog = useCallback((input: Omit<CallLog, "id">) => {
    const id = `call-${Date.now()}`;
    setState((s) => ({ ...s, callLogs: [{ id, ...input }, ...s.callLogs] }));
    return id;
  }, []);

  // The single entry point an AI agent (quoting assistant, phone/text line)
  // would call — see src/lib/ai-actions.ts for the full action contract.
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

  const resetDemoData = useCallback(() => {
    setState(loadInitialState());
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? state.users[0],
    [state.users, state.currentUserId]
  );

  const value: AppContextValue = {
    ...state,
    currentUser,
    setCurrentUserId,
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
    resetDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

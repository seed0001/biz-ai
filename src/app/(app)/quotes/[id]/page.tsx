"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useApp } from "@/lib/store";
import { Badge, Button, Card, OwnerOnlyNotice, inputClass } from "@/components/ui";
import {
  QUOTE_STATUS_LABEL,
  QUOTE_STATUS_STYLE,
  calculateQuoteTotals,
  formatCurrency,
  formatDate,
  lineItemTotal,
} from "@/lib/format";
import type { QuoteLineItem, QuoteStatus } from "@/lib/types";
import { ArrowLeft, Package, Plus, Trash2 } from "lucide-react";

const STATUS_FLOW: QuoteStatus[] = ["draft", "sent", "accepted", "declined"];

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    currentUser,
    quotes,
    customers,
    jobs,
    catalog,
    settings,
    updateQuoteStatus,
    updateQuoteLineItems,
    updateQuoteRates,
    addQuoteItemFromCatalog,
  } = useApp();
  const [pickedCatalogId, setPickedCatalogId] = useState(catalog[0]?.id ?? "");

  const found = quotes.find((q) => q.id === id);
  if (!found) return notFound();
  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;
  const quote = found;

  const customer = customers.find((c) => c.id === quote.customerId);
  const linkedJob = jobs.find((j) => j.quoteId === quote.id);

  const laborRate = quote.laborRate ?? settings.defaultLaborRate;
  const markupPercent = quote.markupPercent ?? settings.defaultMarkupPercent;
  const taxPercent = quote.taxPercent ?? settings.defaultTaxPercent;
  const totals = calculateQuoteTotals(quote, settings);

  function updateItem(itemId: string, patch: Partial<QuoteLineItem>) {
    updateQuoteLineItems(
      quote.id,
      quote.lineItems.map((li) => (li.id === itemId ? { ...li, ...patch } : li))
    );
  }

  function removeItem(itemId: string) {
    updateQuoteLineItems(
      quote.id,
      quote.lineItems.filter((li) => li.id !== itemId)
    );
  }

  function addCustomItem() {
    updateQuoteLineItems(quote.id, [
      ...quote.lineItems,
      {
        id: `li-${Date.now()}`,
        name: "New item",
        category: "Other",
        unit: "each",
        quantity: 1,
        materialCost: 0,
        laborHours: 0,
      },
    ]);
  }

  function addFromCatalog() {
    if (!pickedCatalogId) return;
    addQuoteItemFromCatalog(quote.id, pickedCatalogId, 1);
  }

  return (
    <div>
      <Link href="/quotes" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Back to quotes
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{quote.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {customer?.name} &middot; created {formatDate(quote.createdAt)}
          </p>
        </div>
        <Badge className={QUOTE_STATUS_STYLE[quote.status]}>{QUOTE_STATUS_LABEL[quote.status]}</Badge>
      </div>

      <Card className="mb-6 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Update status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              onClick={() => updateQuoteStatus(quote.id, s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                quote.status === s ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {QUOTE_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </Card>

      {linkedJob && (
        <Card className="mb-6 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Linked job</p>
          <Link href={`/jobs/${linkedJob.id}`} className="text-sm font-medium text-blue-600 hover:underline">
            {linkedJob.title}
          </Link>
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={`${inputClass} w-auto min-w-[220px]`}
              value={pickedCatalogId}
              onChange={(e) => setPickedCatalogId(e.target.value)}
            >
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} &middot; {formatCurrency(c.price)}/{c.unit}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={addFromCatalog} disabled={!catalog.length}>
              <Package size={14} /> Add from catalog
            </Button>
            <Button variant="secondary" onClick={addCustomItem}>
              <Plus size={14} /> Custom item
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Material $</th>
                <th className="px-4 py-2 font-medium">Labor hrs</th>
                <th className="px-4 py-2 font-medium">Line total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lineItems.map((li) => {
                const fromCatalog = Boolean(li.catalogId);
                return (
                  <tr key={li.id}>
                    <td className="px-4 py-2">
                      {fromCatalog ? (
                        <div>
                          <p className="font-medium text-slate-900">{li.name}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <Package size={11} /> {li.category} &middot; from catalog
                          </p>
                        </div>
                      ) : (
                        <input
                          className={inputClass}
                          value={li.name}
                          onChange={(e) => updateItem(li.id, { name: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {fromCatalog ? (
                        li.unit
                      ) : (
                        <input
                          className={`${inputClass} w-24`}
                          value={li.unit}
                          onChange={(e) => updateItem(li.id, { unit: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} w-20`}
                        value={li.quantity}
                        onChange={(e) => updateItem(li.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-2">
                      {fromCatalog ? (
                        <span className="text-slate-600">{formatCurrency(li.materialCost)}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          className={`${inputClass} w-24`}
                          value={li.materialCost}
                          onChange={(e) => updateItem(li.id, { materialCost: Number(e.target.value) })}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        className={`${inputClass} w-20`}
                        value={li.laborHours}
                        onChange={(e) => updateItem(li.id, { laborHours: Number(e.target.value) })}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">
                      {formatCurrency(lineItemTotal(li, laborRate, markupPercent))}
                    </td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeItem(li.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {quote.lineItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    No line items yet. Add one from the catalog or as a custom item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Pricing</h2>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RateField
            label="Labor rate ($/hr)"
            value={laborRate}
            onChange={(v) => updateQuoteRates(quote.id, { laborRate: v })}
          />
          <RateField
            label="Markup %"
            value={markupPercent}
            onChange={(v) => updateQuoteRates(quote.id, { markupPercent: v })}
          />
          <RateField
            label="Tax % (materials only)"
            value={taxPercent}
            onChange={(v) => updateQuoteRates(quote.id, { taxPercent: v })}
          />
        </div>

        <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm">
          <Row label="Materials" value={formatCurrency(totals.materials)} />
          <Row label={`Labor (${totals.laborHours} hrs @ ${formatCurrency(laborRate)})`} value={formatCurrency(totals.laborCost)} />
          <Row label="Direct cost" value={formatCurrency(totals.directCost)} />
          <Row label={`Markup (${markupPercent}%)`} value={formatCurrency(totals.markupAmount)} />
          <Row label={`Tax (${taxPercent}% of materials)`} value={formatCurrency(totals.taxAmount)} />
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function RateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        step="0.1"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

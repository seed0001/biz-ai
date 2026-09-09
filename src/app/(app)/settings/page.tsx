"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Badge, Card, Field, OwnerOnlyNotice, PageHeader, inputClass } from "@/components/ui";
import type { CompanySettings } from "@/lib/types";
import type { ModelOption } from "@/app/api/models/route";

function formatPerM(perM: number): string {
  if (perM === 0) return "free";
  if (perM < 0.01) return `$${perM.toFixed(4)}`;
  return `$${perM.toFixed(2)}`;
}

function modelPriceLabel(m: ModelOption): string {
  if (m.free) return "free";
  return `${formatPerM(m.promptPerM)} in / ${formatPerM(m.completionPerM)} out per 1M tokens`;
}

function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [models, setModels] = useState<ModelOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error || "Could not load models.");
          return;
        }
        setModels(data.models as ModelOption[]);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!models) return [];
    const q = filter.trim().toLowerCase();
    const list = q
      ? models.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      : models;
    // Keep the current selection visible even if it's filtered out.
    if (value && !list.some((m) => m.id === value)) {
      const current = models.find((m) => m.id === value);
      if (current) return [current, ...list];
    }
    return list;
  }, [models, filter, value]);

  const selected = models?.find((m) => m.id === value);

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-rose-600">
          Couldn&apos;t load the OpenRouter model list ({error}). Enter a model id manually.
        </p>
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. anthropic/claude-3.5-haiku"
        />
      </div>
    );
  }

  if (!models) {
    return <p className="text-xs text-slate-500">Loading models from OpenRouter…</p>;
  }

  return (
    <div className="space-y-2">
      <input
        className={inputClass}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={`Filter ${models.length} models…`}
      />
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {filtered.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} — {modelPriceLabel(m)}
          </option>
        ))}
      </select>
      {selected && (
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">{selected.id}</span>
          {" · "}
          {selected.free
            ? "Free model"
            : `${formatPerM(selected.promptPerM)} per 1M input tokens, ${formatPerM(
                selected.completionPerM
              )} per 1M output tokens`}
          {selected.contextLength > 0 && ` · ${selected.contextLength.toLocaleString()} token context`}
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { currentUser, settings, updateSettings } = useApp();
  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  function set<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    updateSettings({ [key]: value });
  }

  return (
    <div>
      <PageHeader title="Settings" description="Company profile, quoting defaults, AI line, and billing." />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Company profile</h2>
          <Field label="Company name">
            <input className={inputClass} value={settings.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </Field>
          <Field label="Business address">
            <input className={inputClass} value={settings.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label="Support email">
            <input className={inputClass} value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
          </Field>
          <Field label="Business type (steers the AI's assumptions and tone)">
            <input
              className={inputClass}
              value={settings.businessType}
              onChange={(e) => set("businessType", e.target.value)}
              placeholder="e.g. General contracting - remodeling, electrical, and repair"
            />
          </Field>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Quoting defaults</h2>
          <p className="mb-4 text-xs text-slate-500">
            Applied to every new quote unless overridden on that quote&apos;s pricing panel.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Labor rate ($/hr)">
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                value={settings.defaultLaborRate}
                onChange={(e) => set("defaultLaborRate", Number(e.target.value))}
              />
            </Field>
            <Field label="Markup %">
              <input
                type="number"
                min={0}
                step="0.5"
                className={inputClass}
                value={settings.defaultMarkupPercent}
                onChange={(e) => set("defaultMarkupPercent", Number(e.target.value))}
              />
            </Field>
            <Field label="Tax % (materials only)">
              <input
                type="number"
                min={0}
                step="0.1"
                className={inputClass}
                value={settings.defaultTaxPercent}
                onChange={(e) => set("defaultTaxPercent", Number(e.target.value))}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">AI assistant model</h2>
          <p className="mb-4 text-xs text-slate-500">
            Runs on OpenRouter. The API key lives server-side in <code>.env.local</code> (never in the
            browser) — see <code>.env.example</code> for setup. Changing the model here takes effect on the
            next request, no restart needed.
          </p>
          <Field label="OpenRouter model">
            <ModelPicker
              value={settings.openRouterModel}
              onChange={(id) => set("openRouterModel", id)}
            />
          </Field>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">AI front desk</h2>
            <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Active</Badge>
          </div>
          <Field label="Business line">
            <input className={inputClass} defaultValue="(555) 010-2200" disabled />
          </Field>
          <Field label="Greeting">
            <textarea
              className={inputClass}
              rows={2}
              value={settings.aiGreeting}
              onChange={(e) => set("aiGreeting", e.target.value)}
            />
          </Field>
          <Field label="When the AI should hand off to a human">
            <select
              className={inputClass}
              value={settings.aiHandoffRule}
              onChange={(e) => set("aiHandoffRule", e.target.value as CompanySettings["aiHandoffRule"])}
            >
              <option value="urgent_only">Only for urgent/emergency issues</option>
              <option value="on_request">Whenever the caller asks for a person</option>
              <option value="never">Never - handle everything, take a message if unsure</option>
            </select>
          </Field>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Plan &amp; billing</h2>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Growth plan</p>
              <p className="text-xs text-slate-500">Up to 10 employees, unlimited AI minutes</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">$149/mo</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

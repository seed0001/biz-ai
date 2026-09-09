"use client";

import { useApp } from "@/lib/store";
import { Badge, Card, Field, OwnerOnlyNotice, PageHeader, inputClass } from "@/components/ui";
import type { CompanySettings } from "@/lib/types";

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
            <select
              className={inputClass}
              value={settings.openRouterModel}
              onChange={(e) => set("openRouterModel", e.target.value)}
            >
              <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B (free)</option>
              <option value="google/gemini-2.0-flash-lite:free">Gemini 2.0 Flash Lite (free)</option>
              <option value="deepseek/deepseek-chat:free">DeepSeek Chat (free)</option>
              <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku (paid)</option>
              <option value="openai/gpt-4o-mini">GPT-4o mini (paid)</option>
            </select>
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

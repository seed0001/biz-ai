# Biz-Ai

A business management portal for contracting businesses — quoting, job/schedule tracking, time tracking, a price catalog, and an AI assistant, with separate owner and employee views.

This is an early, actively-developed prototype. It runs on mock/demo data stored in the browser (no backend database yet) so you can click through the full product experience before any real infrastructure is built behind it.

## Features so far

- **Role-based portals** — an owner/admin view (jobs, quotes, catalog, team, AI line, settings) and a trimmed-down employee view (my jobs, clock in/out, schedule), switchable from the account menu for demo purposes.
- **Jobs & scheduling** — create jobs, assign crew, track status from quoted through invoiced.
- **Quoting** — line items split into material cost and labor hours, with a company-wide labor rate, markup %, and tax % applied automatically (tax on materials only). Quotes can override the defaults per job.
- **Price catalog** — reusable materials/products/services with vendor and pricing info. Quote line items can pull directly from the catalog so pricing stays consistent.
- **Time tracking** — employee clock in/out, team timesheets for owners.
- **AI assistant** — an "Ask AI" panel (owner view) backed by [OpenRouter](https://openrouter.ai), constrained to a typed action schema (create/update jobs, quotes, catalog items, etc.) that's validated against live data before anything is applied. See `src/lib/ai-actions.ts` and `src/app/api/ai/route.ts`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable the AI assistant, copy `.env.example` to `.env.local` and add an [OpenRouter API key](https://openrouter.ai/keys), then restart the dev server.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS. State lives in a React context backed by `localStorage` — there's no database yet.

## Roadmap

- Real backend/database (this currently runs entirely on browser-local mock data)
- AI phone/text front desk (Twilio-backed call and SMS handling)
- Multi-tenant accounts and billing

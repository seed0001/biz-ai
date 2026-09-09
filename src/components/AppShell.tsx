"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Package,
  CalendarDays,
  Users,
  Clock,
  PhoneCall,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar } from "./ui";
import { AiAssistant } from "./AiAssistant";
import { logout } from "@/lib/actions/auth";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/quotes", label: "Quotes", icon: FileText, ownerOnly: true },
  { href: "/catalog", label: "Catalog", icon: Package, ownerOnly: true },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/time", label: "Time", icon: Clock },
  { href: "/team", label: "Team", icon: Users, ownerOnly: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, ownerOnly: true },
  { href: "/ai-line", label: "AI Line", icon: PhoneCall, ownerOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

// Mobile bottom nav keeps to the 4 most-used items per role to avoid crowding.
const MOBILE_ITEMS_OWNER = ["/", "/jobs", "/quotes", "/ai-line"];
const MOBILE_ITEMS_EMPLOYEE = ["/", "/jobs", "/time", "/schedule"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, settings } = useApp();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = currentUser.role === "owner";
  const visibleNav = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);
  const mobileHrefs = isOwner ? MOBILE_ITEMS_OWNER : MOBILE_ITEMS_EMPLOYEE;
  const mobileNav = visibleNav.filter((item) => mobileHrefs.includes(item.href));

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white shadow-[2px_0_8px_-2px_rgba(15,23,42,0.06)] md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
            IC
          </div>
          <span className="truncate text-sm font-semibold text-slate-900">{settings.companyName}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{settings.companyName}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {visibleNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                      active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm md:hidden">
              IC
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AiAssistant />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 shadow-sm transition-shadow duration-150 hover:bg-slate-50 hover:shadow-md"
              >
                <Avatar name={currentUser.name} color={currentUser.color} size={28} />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-slate-900">{currentUser.name}</span>
                  <span className="block text-xs leading-tight text-slate-500">{currentUser.title || currentUser.role}</span>
                </span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-3 py-2">
                      <p className="truncate text-sm font-medium text-slate-900">{currentUser.name}</p>
                      <p className="truncate text-xs text-slate-500">{currentUser.email}</p>
                    </div>
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white shadow-[0_-4px_12px_-4px_rgba(15,23,42,0.08)] md:hidden">
        {mobileNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-blue-700" : "text-slate-500"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

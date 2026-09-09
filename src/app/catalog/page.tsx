"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  OwnerOnlyNotice,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";
import { Edit2, Package, Plus, Search, Trash2 } from "lucide-react";

const SUGGESTED_CATEGORIES = [
  "Materials",
  "Labor",
  "Equipment",
  "Rentals",
  "Delivery",
  "Travel",
  "Licenses & Fees",
  "Subcontractors",
  "Consulting",
  "Other",
];
const SUGGESTED_UNITS = ["each", "hour", "day", "week", "month", "sq ft", "linear ft", "package", "visit", "box"];

const EMPTY_FORM = { name: "", category: "", unit: "each", price: "", vendor: "", description: "" };

export default function CatalogPage() {
  const { currentUser, catalog, addCatalogItem, updateCatalogItem, deleteCatalogItem } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  if (currentUser.role !== "owner") return <OwnerOnlyNotice />;

  const categories = useMemo(() => {
    const set = new Set(catalog.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [catalog]);

  const term = searchTerm.toLowerCase();
  const filtered = catalog.filter((i) => {
    const matchesSearch =
      i.name.toLowerCase().includes(term) ||
      i.category.toLowerCase().includes(term) ||
      i.vendor.toLowerCase().includes(term) ||
      i.description.toLowerCase().includes(term);
    const matchesCat = categoryFilter === "all" || i.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(item: CatalogItem) {
    setForm({
      name: item.name,
      category: item.category,
      unit: item.unit,
      price: String(item.price),
      vendor: item.vendor,
      description: item.description,
    });
    setEditingId(item.id);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "Other",
      unit: form.unit.trim() || "each",
      price: parseFloat(form.price) || 0,
      vendor: form.vendor.trim(),
      description: form.description.trim(),
    };
    if (editingId) {
      updateCatalogItem(editingId, payload);
    } else {
      addCatalogItem(payload);
    }
    setShowModal(false);
  }

  function handleDelete(id: string) {
    if (window.confirm("Remove this item from the catalog?")) {
      deleteCatalogItem(id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Price Catalog"
        description="Reusable materials, products, and flat-rate services. Quotes pull pricing from here so it stays consistent."
        action={
          <Button onClick={openAdd}>
            <Plus size={16} /> Add item
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search name, category, vendor, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className={`${inputClass} w-auto min-w-[180px]`}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories ({catalog.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No catalog items match. Adjust your search or add a new item." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <Badge className="mt-1 bg-slate-100 text-slate-600 ring-slate-600/20">{item.category}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                  <p className="text-xs text-slate-400">/{item.unit}</p>
                </div>
              </div>
              <p className="mb-3 flex-1 text-xs text-slate-500">{item.description || "No description provided."}</p>
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">{item.vendor || "No vendor set"}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? "Edit catalog item" : "Add catalog item"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <Field label="Name">
              <input
                className={inputClass}
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Quartz countertop slab"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <input
                  className={inputClass}
                  list="catalog-categories"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Materials"
                />
                <datalist id="catalog-categories">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Unit">
                <input
                  className={inputClass}
                  list="catalog-units"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
                <datalist id="catalog-units">
                  {SUGGESTED_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price ($ per unit)">
                <input
                  type="number"
                  step="any"
                  min={0}
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </Field>
              <Field label="Vendor / source">
                <input
                  className={inputClass}
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                className={inputClass}
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Package size={14} /> {editingId ? "Save changes" : "Add to catalog"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

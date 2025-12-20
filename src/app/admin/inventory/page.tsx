"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Save,
  AlertTriangle,
  CheckCircle,
  Warehouse,
} from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

interface InventoryItem {
  id: number;
  name: string;
  price: number;
  on_hand: number;
  reserved: number;
  available: number;
  inventory_updated_at: string | null;
}

export default function InventoryPage() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch("/api/admin/inventory");
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await res.json();
      setInventory(data.inventory);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch inventory:", e);
      setError("Failed to load inventory");
      showToast("Failed to load inventory", "error");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditValue(item.on_hand.toString());
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveStock(id: number) {
    const onHand = parseInt(editValue, 10);
    if (isNaN(onHand) || onHand < 0) {
      showToast("Stock must be a non-negative number", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onHand }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to update stock", "error");
        return;
      }

      showToast("Stock updated", "success");
      setEditingId(null);
      fetchInventory();
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(available: number) {
    if (available <= 0)
      return { label: "Out of Stock", color: "text-red-600 bg-red-50" };
    if (available <= 5)
      return { label: "Low Stock", color: "text-orange-600 bg-orange-50" };
    return { label: "In Stock", color: "text-green-600 bg-green-50" };
  }

  if (loading) {
    return (
      <div className="container-custom py-10 md:py-14">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
        <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-10 md:py-14">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Warehouse
              size={20}
              className="text-[var(--color-text-secondary)]"
            />
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Admin Panel
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Inventory
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Manage product stock levels
          </p>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
        {inventory.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 py-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
              No products found
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Products will appear here once they are added.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  On Hand
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Reserved
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {inventory.map((item) => {
                const status = getStockStatus(item.available);
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {item.name}
                      </p>
                      <p className="text-sm text-[var(--color-text-tertiary)]">
                        ${Number(item.price).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {item.available <= 0 ? (
                          <AlertTriangle size={12} />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-[var(--color-border)] rounded-lg focus:border-[var(--color-primary)] focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {item.on_hand}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-[var(--color-text-secondary)]">
                      {item.reserved}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`font-semibold ${
                          item.available <= 0
                            ? "text-red-600"
                            : item.available <= 5
                            ? "text-orange-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.available}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveStock(item.id)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            <Save size={14} />
                            {saving ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(item)}
                          className="px-3 py-1 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          Edit Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

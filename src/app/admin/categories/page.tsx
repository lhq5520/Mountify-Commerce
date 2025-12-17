"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, X } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  product_count: number;
  created_at: string;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  displayOrder: 0,
};

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
      }
    } catch (e) {
      console.error("Failed to fetch categories:", e);
      showToast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate slug from name
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug if creating new or slug hasn't been manually edited
      slug: editingId ? prev.slug : generateSlug(name),
    }));
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      displayOrder: category.display_order,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/admin/categories/${editingId}`
        : "/api/admin/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to save category", "error");
        return;
      }

      showToast(editingId ? "Category updated" : "Category created", "success");
      closeModal();
      fetchCategories();
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to delete category", "error");
        return;
      }

      showToast("Category deleted", "success");
      setDeletingId(null);
      fetchCategories();
    } catch (e) {
      showToast("Network error", "error");
    }
  }

  return (
    <div className="container-custom py-10 md:py-14">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Categories
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Manage product categories
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          Add Category
        </button>
      </header>

      {/* Categories Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="p-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-lg mb-3 animate-pulse"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-base font-medium text-[var(--color-text-primary)] mb-2">
              No categories yet
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create your first category to organize products.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {categories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)]">
                        <GripVertical size={16} />
                        <span>{category.display_order}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {category.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                      {category.product_count}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingId(category.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {editingId ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-[var(--color-text-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  placeholder="e.g. Hiking Gear"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      slug: e.target.value.toLowerCase(),
                    }))
                  }
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors font-mono text-sm"
                  placeholder="e.g. hiking-gear"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      displayOrder: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  min={0}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                />
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  Lower numbers appear first
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeletingId(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Delete Category?
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Products in this category will become uncategorized. This action
              cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

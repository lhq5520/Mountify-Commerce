// src/app/api/admin/categories/[id]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redis } from "@/lib/redis";

const CACHE_KEYS = { categoriesAll: "categories:all" };

// PUT - Update category
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    // Parse JSON body safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, slug, description, displayOrder } = body ?? {};

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Normalize inputs
    const normalizedName = String(name).trim().replace(/\s+/g, " ");
    const normalizedSlug = String(slug).toLowerCase().trim();
    const normalizedDesc =
      description != null && String(description).trim() !== ""
        ? String(description).trim()
        : null;

    // Validate slug (lowercase letters, numbers, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(normalizedSlug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const display_order = displayOrder ?? 0;

    const result = await query(
      `UPDATE categories
       SET name = $1, slug = $2, description = $3, display_order = $4
       WHERE id = $5
       RETURNING *`,
      [normalizedName, normalizedSlug, normalizedDesc, display_order, categoryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Cache invalidation
    await redis.del(CACHE_KEYS.categoriesAll);

    return NextResponse.json({ category: result.rows[0] });
  } catch (e: any) {
    console.error("Error updating category:", e);

    if (e?.code === "23505") {
      if (e.constraint === "uq_categories_name") {
        return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
      }
      if (e.constraint === "uq_categories_slug") {
        return NextResponse.json({ error: "Category slug already exists" }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE - Delete category
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const categoryId = parseInt(id, 10);
    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    // Delete category (products.category_id will become NULL via ON DELETE SET NULL)
    const result = await query("DELETE FROM categories WHERE id = $1 RETURNING *", [
      categoryId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Cache invalidation
    await redis.del(CACHE_KEYS.categoriesAll);

    return NextResponse.json({ success: true, deleted: result.rows[0] });
  } catch (e: any) {
    console.error("Error deleting category:", e);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

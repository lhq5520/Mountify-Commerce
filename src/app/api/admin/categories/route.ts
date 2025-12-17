import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redis } from "@/lib/redis";

const CACHE_KEYS = { categoriesAll: "categories:all" };

// GET - Fetch all categories
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const result = await query(`
    SELECT
        c.id, c.name, c.slug, c.description, c.display_order, c.created_at,
        COUNT(p.id)::int AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name, c.slug, c.description, c.display_order, c.created_at
    ORDER BY c.display_order ASC, c.name ASC
    `);

    return NextResponse.json({ categories: result.rows });
  } catch (e: any) {
    console.error("Error fetching categories:", e);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST - Create a new category
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { name, slug, description, displayOrder } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    // Validate slug format (only lowercase letters, numbers, and hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO categories (name, slug, description, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), slug.toLowerCase().trim(), description?.trim() || null, displayOrder ?? 0]
    );

    await redis.del(CACHE_KEYS.categoriesAll);

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (e: any) {
    console.error("Error creating category:", e);
    
    // Handle unique constraint errors
    if (e.code === "23505") {
      if (e.constraint === "uq_categories_name") {
        return NextResponse.json({ error: "Category name already exists" }, { status: 400 });
      }
      if (e.constraint === "uq_categories_slug") {
        return NextResponse.json({ error: "Category slug already exists" }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
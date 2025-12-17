import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Product } from "@/app/types";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const sort = searchParams.get("sort");
    const page = searchParams.get("page");
    const search = searchParams.get("search");

    // Has filter params → query database
    // NOTE: default values should NOT count as filters, otherwise it will always hit DB
    const normalizedCategory = category?.trim().toLowerCase() || null;
    const normalizedSort = (sort?.trim().toLowerCase() || "newest");
    const normalizedPage = parseInt(page || "1", 10);
    const normalizedSearch = search?.trim() || null;

    const hasFilters =
      (normalizedCategory && normalizedCategory !== "all") ||
      (normalizedSort && normalizedSort !== "newest") ||
      (Number.isFinite(normalizedPage) && normalizedPage > 1) ||
      (normalizedSearch && normalizedSearch.length >= 2);

    if (hasFilters) {
      return await getFilteredProducts(searchParams);
    }

    // No params → use cache (existing logic)
    return await getAllProductsCached();

  } catch (e: any) {
    console.error("Error fetching products:", e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// ---------------- Original caching logic ------------------------
async function getAllProductsCached() {
  const cachedProducts = await redis.get(CACHE_KEYS.PRODUCTS_ALL);

  if (cachedProducts) {
    console.log("Cache HIT - Products loaded from Redis");
    return NextResponse.json({
      products: typeof cachedProducts === "string" ? JSON.parse(cachedProducts) : cachedProducts,
      source: "cache",
    });
  }

  console.log("Cache MISS - Loading from database");

  const result = await query("SELECT * FROM products ORDER BY id ASC");

  const products: Product[] = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description,
    image_url: row.image_url,
    image_url_hover: row.image_url_hover,
    detailed_description: row.detailed_description,
  }));

  await redis.set(
    CACHE_KEYS.PRODUCTS_ALL,
    JSON.stringify(products),
    { ex: CACHE_TTL.PRODUCTS }
  );

  console.log(`Cached ${products.length} products for ${CACHE_TTL.PRODUCTS}s`);

  return NextResponse.json({
    products,
    source: "database",
  });
}

// ------------------- Filter/sort/pagination logic ----------------------
async function getFilteredProducts(searchParams: URLSearchParams) {
  const category = searchParams.get("category")?.trim().toLowerCase() || null;
  const search = searchParams.get("search")?.trim() || null;
  const sortParam = (searchParams.get("sort")?.trim().toLowerCase() || "newest");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (category && category !== "all") {
    conditions.push(`c.slug = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (search && search.length >= 2) {
    conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sort
  let orderClause = "ORDER BY p.created_at DESC";
  switch (sortParam) {
    case "price_asc":
      orderClause = "ORDER BY p.price ASC";
      break;
    case "price_desc":
      orderClause = "ORDER BY p.price DESC";
      break;
    case "name":
      orderClause = "ORDER BY p.name ASC";
      break;
    case "oldest":
      orderClause = "ORDER BY p.created_at ASC";
      break;
    case "newest":
    default:
      orderClause = "ORDER BY p.created_at DESC";
      break;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}`,
    params
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Get products
  const productsResult = await query(
    `SELECT 
      p.id, p.name, p.price, p.description, p.detailed_description,
      p.category_id, p.created_at, 
      p.image_url, p.image_url_hover,
      c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ${orderClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const products = productsResult.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    description: row.description,
    detailed_description: row.detailed_description,
    category_id: row.category_id,
    category_name: row.category_name,
    category_slug: row.category_slug,
    image_url: row.image_url,
    image_url_hover: row.image_url_hover,
  }));

  return NextResponse.json({
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
    source: "database-filtered",
  });
}

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { redis } from "@/lib/redis";

const CACHE_KEY = "categories:all";
const CACHE_TTL = 60 * 60; // 1 hour

export async function GET() {
  try {
    // get from redis 
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return NextResponse.json({ 
        categories: typeof cached === "string" ? JSON.parse(cached) : cached 
      });
    }

    // if not able get from redis, get from db
    const result = await query(`
      SELECT id, name, slug, description, display_order
      FROM categories
      ORDER BY display_order ASC, name ASC
    `);

    // write cache
    await redis.set(CACHE_KEY, JSON.stringify(result.rows), { ex: CACHE_TTL });

    return NextResponse.json({ categories: result.rows });
  } catch (e: any) {
    console.error("Error fetching categories:", e.message);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
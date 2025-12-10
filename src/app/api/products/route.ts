import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Product } from "@/app/types";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";

export async function GET() {
  //new step4d- redis logic implementation
  try {
    //Step 1.try to get from redis
    const cachedProducts = await redis.get(CACHE_KEYS.PRODUCTS_ALL);

    if (cachedProducts) {
      console.log('Cache HIT - Products loaded from Redis');
      return NextResponse.json({ 
        products: cachedProducts,
        source: 'cache'  // For debugging
      });
    }

    console.log('Cache MISS - Loading from database');

    //Step 2.if cache miss - querry database

    const result = await query("SELECT * FROM products ORDER BY id ASC");

    const products: Product[] = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price), // remember that：snake_case → camelCase + number
      description: row.description,
      image_url: row.image_url,
      image_url_hover: row.image_url_hover,
      detailed_description: row.detailed_description,
    }));

    // old api would just return database from here -> return NextResponse.json({ products });

    // Step 3: store in redis with 10-minute expiration
    await redis.setex(
      CACHE_KEYS.PRODUCTS_ALL,
      CACHE_TTL.PRODUCTS,
      JSON.stringify(products)
    );

    console.log(`Cached ${products.length} products for ${CACHE_TTL.PRODUCTS}s`);

    return NextResponse.json({ 
      products,
      source: 'database'  // For debugging
    });

  } catch (e: any) {
    console.error("Error fetching products:", e);

    try {
      const result = await query("SELECT * FROM products ORDER BY id ASC");
      return NextResponse.json({ 
        products: result.rows,
        source: 'database-fallback'
      });

    } catch (dbError) {
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { redis, CACHE_KEYS } from "@/lib/redis";

//step5a- admin panel for all product

// GET /api/admin/products - Get all products (for admin panel)
export async function GET() {
  try {
    const session = await auth();
    
    // Check admin permission
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT id, name, price, description, detailed_description, image_url, image_url_hover, created_at 
       FROM products 
       ORDER BY created_at DESC`
    );

    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price),
      description: row.description,
      detailedDescription: row.detailed_description,
      imageUrl: row.image_url,
      imageUrlHover: row.image_url_hover,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ products });

  } catch (e: any) {
    console.error("Error fetching products:", e);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Check admin permission
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, price, description, detailedDescription, imageUrl, imageUrlHover } = body;

    // Validation
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: "Price must be greater than 0" },
        { status: 400 }
      );
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!imageUrl || imageUrl.trim().length === 0) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Basic URL format validation
    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(imageUrl)) {
      return NextResponse.json(
        { error: "Image URL must be a valid URL (http:// or https://)" },
        { status: 400 }
      );
    }

    if (imageUrlHover && !urlRegex.test(imageUrlHover)) {
      return NextResponse.json(
        { error: "Hover image URL must be a valid URL" },
        { status: 400 }
      );
    }

    // Insert product
    const result = await query(
      `INSERT INTO products (name, price, description, detailed_description, image_url, image_url_hover) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, price, created_at`,
      [
        name.trim(),
        price,
        description.trim(),
        detailedDescription?.trim() || description.trim(),
        imageUrl.trim(),
        imageUrlHover?.trim() || null
      ]
    );

    const newProduct = result.rows[0];

    // Invalidate product cache
    await redis.del(CACHE_KEYS.PRODUCTS_ALL);
    console.log('Cleared product cache after creation');

    return NextResponse.json(
      { 
        message: "Product created successfully",
        product: {
          id: newProduct.id,
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          createdAt: newProduct.created_at
        }
      },
      { status: 201 }
    );

  } catch (e: any) {
    console.error("Error creating product:", e);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
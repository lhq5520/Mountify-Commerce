import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
    
interface CartItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  quantity: number;
  }
    
interface CartRow {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  price: string;
  image_url: string;
  description: string;
  }

// GET /api/cart - Fetch user's cart
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Query cart with product details (JOIN)
    const result = await query(
      `SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
        p.price,
        p.image_url,
        p.description
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
      ORDER BY ci.created_at DESC`,
      [userId]
    );

    const cartItems: CartItem[] = (result.rows as CartRow[]).map(row => ({
        id: row.product_id,
        name: row.name,
        price: parseFloat(row.price),
        imageUrl: row.image_url,
        description: row.description,
        quantity: row.quantity,
    }));

    return NextResponse.json({ cart: cartItems });

  } catch (e: any) {
    console.error("Error fetching cart:", e);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add product to cart
export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const body = await req.json();
    const { productId, quantity = 1 } = body;

    // Validate inputs
    if (!productId || typeof productId !== 'number') {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return NextResponse.json(
        { error: "Quantity must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // Verify product exists
    const productCheck = await query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // UPSERT: Insert or update quantity
    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity, updated_at) 
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, product_id) 
       DO UPDATE SET 
         quantity = cart_items.quantity + EXCLUDED.quantity,
         updated_at = NOW()`,
      [userId, productId, quantity]
    );

    return NextResponse.json(
      { message: "Added to cart" },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error adding to cart:", e);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Clear entire cart
export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    await query(
      "DELETE FROM cart_items WHERE user_id = $1",
      [userId]
    );

    return NextResponse.json(
      { message: "Cart cleared" },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error clearing cart:", e);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
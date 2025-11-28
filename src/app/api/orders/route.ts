// api/orders

import { NextResponse } from "next/server";
import { query } from "@/lib/db"

type OrderItemInput = {
  productId: number;
  quantity: number;
  priceCad: number;
};

type OrderInput = {
  email?: string;
  items: OrderItemInput[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OrderInput;

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "No items in order" },
        { status: 400 }
      );
    }

    const email = body.email ?? null;

    // calculate total price
    const total = body.items.reduce(
      (sum, item) => sum + item.priceCad * item.quantity,
      0
    );

    // Fake ACID transaction
    const orderRes = await query(
      "INSERT INTO orders (email, total_cad) VALUES ($1, $2) RETURNING id",
      [email, total]
    );

    const orderId = orderRes.rows[0].id as number;

    // insert every order_items
    for (const item of body.items) {
      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_cad) VALUES ($1, $2, $3, $4)",
        [orderId, item.productId, item.quantity, item.priceCad]
      );
    }

    return NextResponse.json(
      { orderId, total },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("Error creating order:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

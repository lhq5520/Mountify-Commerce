// api/checkout

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query } from "@/lib/db"; // use for order insertion when checkout

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover",
});

type CheckoutItem = {
  productId: number;
  name: string;
  priceCad: number;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
  email?: string;
};

export async function POST(req: Request) {
  try {
    // 1. parse the JSON
    const body = await req.json() as CheckoutBody
    
    // 2. verify：if cart is empty?
    if (!body.items || body.items.length === 0) {  // two conditions here
      return NextResponse.json(
        { error: "No items to checkout" },
        { status: 400 }
      );
    }
    
    // 3.implement stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
    body.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: "cad",
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.priceCad * 100),
        },
    }));

    const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    customer_email: body.email,
    });

    // create orders with sessionid - updated logic in step3A before that was api/orders directly to insert tables
    const email = body.email ?? null;  // get the email first

    //calculate total
    const total = body.items.reduce(
      (sum, item) => sum + item.priceCad * item.quantity, 
      0
    );

    //insert into "orders" table
    const orderRes = await query(
      "INSERT INTO orders (email, total_cad, status, stripe_session_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [email, total, "pending", session.id]
    );

    const orderId = orderRes.rows[0].id as number;

    //insert into "orders_items" table
    for (const item of body.items) {
      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_cad) VALUES ($1, $2, $3, $4)",
        [orderId, item.productId, item.quantity, item.priceCad]
      );
    }

    return NextResponse.json({ url: session.url });
    
  } catch (e: any) {
    // error handling
    console.error("Error creating checkout session:", e);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
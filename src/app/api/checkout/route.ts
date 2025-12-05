// api/checkout

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query } from "@/lib/db"; // use for order insertion when checkout
import { auth } from "@/auth";  // ← use for user validation

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover",
});

//step3b updated - for security purpose, we only need quantity and productID from frontend
type CheckoutItem = {
  productId: number;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
  email?: string;
};

export async function POST(req: Request) {
  try {
    const usersession = await auth();
    // 1. parse the JSON
    const body = await req.json() as CheckoutBody
    
    // 2. verify：if cart is empty?
    if (!body.items || body.items.length === 0) {  // two conditions here
      return NextResponse.json(
        { error: "No items to checkout" },
        { status: 400 }
      );
    }

    // updated in step3b - validate quantity range to avoid abuse
    for (const item of body.items) {
      if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { error: "Invalid quantity format" },
          { status: 400 }
        );
      }

      if (item.quantity < 1 || item.quantity > 1000) {
        return NextResponse.json(
          { error: "Quantity must be between 1 and 1000" },
          { status: 400 }
        );
      }
    }

    // updated in step3b - querry to check price from backend
    const requestedIds = body.items.map((item) => item.productId);

      //updated in step3b - database curry
    const result = await query(
      "SELECT id, price, name FROM products WHERE id = ANY($1)",
      [requestedIds]
    );

    // updated in step3b - verify if we have the product
    const foundIds = result.rows.map((row: { id: number }) => row.id)!;
    const missingIds = requestedIds.filter(id => !foundIds.includes(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Products not found: ${missingIds.join(', ')}` },
        { status: 400 }
      );
    }

    // updated in step3b - if product exists，build a map for quick search
    // Ex.const product = productMap.get(1); -> { price: 29.99, name: "productA" }
    const productMap = new Map<number, { price: number; name: string }>();
    for (const row of result.rows) {
      productMap.set(row.id, { price: row.price, name: row.name });
    }
    
    // 3.implement stripe
      //updated in step3b- using productMap, which returns from backend to create LineItem
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      body.items.map((item) => {
        const product = productMap.get(item.productId)!;
      
        return {  
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
            },
            unit_amount: Math.round(product.price * 100),
          },
        };
      });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
      customer_email: body.email,
    });

    // create orders with sessionid - updated logic in step3A before that was api/orders directly to insert tables
    // updated in step4a- now using session to send user email and potentially userID
    const email = usersession?.user?.email || body.email || null;
    const userId = usersession?.user?.id ? parseInt(usersession.user.id) : null;

    //updated in step3b - calculate total
    const total = body.items.reduce((sum, item) => {
      const product = productMap.get(item.productId)!;
      return sum + product.price * item.quantity;  // ← price from db
    }, 0);

    //insert into "orders" table
    const orderRes = await query(
      "INSERT INTO orders (email, total, status, stripe_session_id, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [email, total, "pending", session.id, userId]
    );

    const orderId = orderRes.rows[0].id as number;

    //insert into "orders_items" table
    // updated in step3b - 
    for (const item of body.items) {
      const product = productMap.get(item.productId)!;

      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, item.productId, item.quantity, product.price]
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
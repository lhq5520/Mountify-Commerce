// /api/webhooks/stripe

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: Request) {
  try {
    // 1. Read raw request body
    const body = await req.text()
    
    // 2. Verify Stripe signature
        // 1. get signature（from header）
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
        return NextResponse.json({ error: "No signature" }, { status: 400 });
    }
        // 2. verify signature and parse event
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);


    // 3. Parse event
    // 4. Handle based on event type
    // 5. Update database
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        
        // check is payment status is successful
        if (session.payment_status === "paid") {
          // update order status
          await query(
            "UPDATE orders SET status = $1 WHERE stripe_session_id = $2",
            ["paid", session.id]
          );

          // get order detail and send email
          try {
            const orderResult = await query(
              `SELECT o.id, o.email, o.total, o.created_at,
                      json_agg(json_build_object(
                        'name', p.name,
                        'quantity', oi.quantity,
                        'price', oi.price
                      )
                        ORDER BY oi.id ASC
                      ) as items
              FROM orders o
              JOIN order_items oi ON o.id = oi.order_id
              JOIN products p ON oi.product_id = p.id
              WHERE o.stripe_session_id = $1
              GROUP BY o.id`,
              [session.id]
            );

            if (orderResult.rows.length > 0) {
              const order = orderResult.rows[0];
              await sendOrderConfirmationEmail({
                orderId: order.id,
                email: order.email,
                total: parseFloat(order.total),
                items: order.items,
                createdAt: order.created_at,
              });
              console.log(`Confirmation email sent for order #${order.id}`);
            }
          } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
          }
          
          console.log(`Order paid for session: ${session.id}`);
        }
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (e: any) {
    console.error("Webhook error:", e);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
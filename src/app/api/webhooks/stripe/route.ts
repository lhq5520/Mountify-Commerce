// /api/webhooks/stripe

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { query } from "@/lib/db";

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
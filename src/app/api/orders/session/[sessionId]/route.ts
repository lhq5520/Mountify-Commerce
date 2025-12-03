// api/orders/session/[sessionId]
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
     const  { sessionId } = await params;

    // querry the order by session id
    const result = await query(
      "SELECT id, status, email, total FROM orders WHERE stripe_session_id = $1",
      [sessionId]
    );

    // if order not found
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const order = result.rows[0];

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      email: order.email,
      total: order.total,
    });

  } catch (e: any) {
    console.error("Error fetching order:", e);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
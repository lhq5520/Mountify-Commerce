import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { fetchTrackingInfo, CarrierCode } from "@/lib/tracking";

// POST /api/admin/orders/:id/tracking - Refresh tracking information
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (!Number.isFinite(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Fetch order with status and tracking_last_sync for throttling
    const orderResult = await query(
      `SELECT id, status, tracking_number, carrier, tracking_last_sync
       FROM orders
       WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // Only allow refresh for shipped/delivered status
    if (order.status !== "shipped" && order.status !== "delivered") {
      return NextResponse.json(
        { error: `Cannot refresh tracking when status is ${order.status}` },
        { status: 400 }
      );
    }

    if (!order.tracking_number || !order.carrier) {
      return NextResponse.json({ error: "No tracking info for this order" }, { status: 400 });
    }

    // Simple throttle: disallow refresh within 30 seconds
    if (order.tracking_last_sync) {
      const last = new Date(order.tracking_last_sync).getTime();
      const now = Date.now();
      if (now - last < 30 * 1000) {
        return NextResponse.json(
          { error: "Too frequent. Please wait a bit before refreshing again." },
          { status: 429 }
        );
      }
    }

    // Fetch tracking information
    const trackingInfo = await fetchTrackingInfo(
      order.carrier as CarrierCode,
      order.tracking_number
    );

    if (!trackingInfo) {
      return NextResponse.json(
        { error: "Could not fetch tracking info. API limit may be reached." },
        { status: 503 }
      );
    }

    // Status policy: only allow shipped -> delivered transition
    const newStatus = trackingInfo.status === "delivered" ? "delivered" : order.status;

    // Update order with conditional check to prevent stale updates
    const updateRes = await query(
      `UPDATE orders
       SET status = $2,
           tracking_details = $3,
           tracking_last_sync = NOW(),
           updated_at = NOW()
       WHERE id = $1
         AND tracking_number = $4
         AND carrier = $5
       RETURNING id, status, tracking_last_sync`,
      [orderId, newStatus, trackingInfo, order.tracking_number, order.carrier]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Order tracking info changed. Please reload and try again." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Tracking info updated",
      status: updateRes.rows[0].status,
      tracking: trackingInfo,
    });
  } catch (e: any) {
    console.error("Error refreshing tracking:", e);
    return NextResponse.json({ error: "Failed to refresh tracking" }, { status: 500 });
  }
}

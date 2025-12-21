import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { fetchTrackingInfo, CARRIERS, CarrierCode } from "@/lib/tracking";
import { sendShipmentNotificationEmail } from "@/lib/email";

// POST /api/admin/orders/:id/ship - Ship order
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

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const trackingNumberRaw = body?.trackingNumber;
    const carrierRaw = body?.carrier;

    // Validate input
    if (!trackingNumberRaw || typeof trackingNumberRaw !== "string" || trackingNumberRaw.trim().length === 0) {
      return NextResponse.json({ error: "Tracking number is required" }, { status: 400 });
    }

    if (!carrierRaw || typeof carrierRaw !== "string") {
      return NextResponse.json(
        { error: `Invalid carrier. Must be one of: ${Object.keys(CARRIERS).join(", ")}` },
        { status: 400 }
      );
    }

    const trackingNumber = trackingNumberRaw.trim();
    const carrier = carrierRaw.trim();

    // Validate carrier against supported carriers
    if (!Object.prototype.hasOwnProperty.call(CARRIERS, carrier)) {
      return NextResponse.json(
        { error: `Invalid carrier. Must be one of: ${Object.keys(CARRIERS).join(", ")}` },
        { status: 400 }
      );
    }

    // Check if order exists
    const orderCheck = await query(
      "SELECT id, status, email FROM orders WHERE id = $1",
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderCheck.rows[0];

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `Cannot ship order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Attempt to fetch tracking info (may fail, fallback to manual mode)
    let trackingDetails: any = null;
    let trackingLastSync: Date | null = null;

    try {
      const trackingInfo = await fetchTrackingInfo(carrier as CarrierCode, trackingNumber);
      if (trackingInfo) {
        trackingDetails = trackingInfo;
        trackingLastSync = new Date(); // Can also use DB NOW(), keeping current style
      }
    } catch (e) {
      console.log("Tracking API unavailable, using manual mode");
    }

    // Update order (with AND status='paid' to prevent concurrent duplicate shipments)
    const result = await query(
      `UPDATE orders
       SET status = 'shipped',
           tracking_number = $2,
           carrier = $3,
           shipped_at = NOW(),
           tracking_details = $4,
           tracking_last_sync = $5,
           updated_at = NOW()
       WHERE id = $1
         AND status = 'paid'
       RETURNING id, status, tracking_number, carrier, shipped_at`,
      [
        orderId,
        trackingNumber,
        carrier,
        trackingDetails,     // Pass directly as JSON, no stringify
        trackingLastSync,
      ]
    );

    if (result.rows.length === 0) {
      // Order was just shipped by someone else or status was changed
      return NextResponse.json(
        { error: "Order is no longer in paid status (maybe already shipped)" },
        { status: 409 }
      );
    }

    // Send shipment notification email (best-effort, do not block response)
    try {
      const shippedRow = result.rows[0];
      const trackingUrl = CARRIERS[carrier as CarrierCode]?.trackingUrl
        ? `${CARRIERS[carrier as CarrierCode].trackingUrl}${trackingNumber}`
        : "";

      const emailResult = await sendShipmentNotificationEmail({
        orderId: shippedRow.id,
        email: order.email,
        carrier,
        trackingNumber,
        trackingUrl,
        shippedAt: shippedRow.shipped_at ?? new Date().toISOString(),
      });

      if (!emailResult.success) {
        console.error("Failed to send shipment email:", emailResult.error);
      } else {
        console.log(`Shipment email sent for order #${shippedRow.id}`);
      }
    } catch (emailErr) {
      console.error("Shipment email exception:", emailErr);
    }

    return NextResponse.json({
      message: "Order shipped successfully",
      order: result.rows[0],
      trackingAvailable: trackingDetails !== null,
    });
  } catch (e: any) {
    console.error("Error shipping order:", e);
    return NextResponse.json({ error: "Failed to ship order" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// GET /api/admin/shipping - 获取发货相关订单
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 获取 paid, shipped, delivered 的订单
    const result = await query(
      `SELECT 
        o.id,
        o.email,
        o.total,
        o.status,
        o.created_at,
        o.tracking_number,
        o.carrier,
        o.shipped_at,
        o.tracking_details,
        o.tracking_last_sync,
        o.shipping_name,
        o.shipping_phone,
        o.shipping_address,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', oi.product_id,
              'productName', p.name,
              'imageUrl', p.image_url,
              'quantity', oi.quantity,
              'price', oi.price
            )
            ORDER BY oi.id
          ),
          '[]'::json
        ) as items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.status IN ('paid', 'shipped', 'delivered')
       GROUP BY 
         o.id,
         o.email,
         o.total,
         o.status,
         o.created_at,
         o.tracking_number,
         o.carrier,
         o.shipped_at,
         o.tracking_details,
         o.tracking_last_sync,
         o.shipping_name,
         o.shipping_phone,
         o.shipping_address
       ORDER BY 
         CASE o.status 
           WHEN 'paid' THEN 1 
           WHEN 'shipped' THEN 2 
           WHEN 'delivered' THEN 3 
         END,
         o.created_at DESC`
    );

    const orders = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      // pg 的 numeric 常常是 string，这里统一成 number，避免前端/计算踩坑
      total: Number(row.total),
      status: row.status,
      createdAt: row.created_at,
      trackingNumber: row.tracking_number,
      carrier: row.carrier,
      shippedAt: row.shipped_at,
      trackingDetails: row.tracking_details,
      trackingLastSync: row.tracking_last_sync,
      shippingName: row.shipping_name,
      shippingPhone: row.shipping_phone,
      shippingAddress: row.shipping_address,
      items: row.items, // SQL 已保证至少是 []
    }));

    return NextResponse.json({ orders });
  } catch (e: any) {
    console.error("Error fetching shipping orders:", e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

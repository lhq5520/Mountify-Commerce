import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const result = await query(
    "SELECT id, email, total_cad, created_at FROM orders ORDER BY created_at DESC"
  );
  return NextResponse.json({ orders: result.rows });
}

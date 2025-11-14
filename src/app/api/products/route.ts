import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET() {
  const result = await query("SELECT * FROM products ORDER BY id ASC");
  return NextResponse.json({ products: result.rows });
}

import { NextResponse } from "next/server";
import { query } from "../../../lib/db";
import type { Product } from "@/app/types";

export async function GET() {
  const result = await query("SELECT * FROM products ORDER BY id ASC");

  const products: Product = result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    priceCad: Number(row.price_cad), // remember that：snake_case → camelCase + number
    car: row.car,
    description: row.description,
  }));

  return NextResponse.json({ products });
}

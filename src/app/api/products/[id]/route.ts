// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// 第二个参数叫 context，里面的 params 是一个 Promise
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params; // ★ 这里要 await

  const id = Number(rawId);

  if (!rawId || Number.isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid id", debug: { rawId } },
      { status: 400 }
    );
  }

  const result = await query("SELECT * FROM products WHERE id = $1", [id]);
  console.log("DB rows =", result.rows);

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "Product not found", debug: { id } },
      { status: 404 }
    );
  }

  const row: any = result.rows[0];

  const product = {
    id: row.id,
    name: row.name,
    // JSON 里 price_cad 是字符串，这里转成 number 给前端用
    priceCad: Number(row.price_cad),
    description: row.description,
  };

  return NextResponse.json({ product });
}

// fetch(`/api/products/${id}`) → directly fetch this product

// Use res.ok to determine success/failure; on failure, read the `error` field from the JSON

// Three states:

// loading: initial / in-progress request

// error: something went wrong

// product === null: no data (e.g., 404)

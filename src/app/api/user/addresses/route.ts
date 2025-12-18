import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db"; // use pool for transaction

// GET - Fetch all addresses for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, name, line1, line2, city, state, postal_code, country, phone, is_default, created_at, updated_at
         FROM addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [session.user.id]
      );

      return NextResponse.json({ addresses: result.rows });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("Error fetching addresses:", e);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

// POST - Create a new address
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    name,
    line1,
    line2,
    city,
    state,
    postalCode,
    country,
    phone,
    isDefault,
  } = body;

  // Validate required fields
  if (!name || !line1 || !city || !postalCode || !country) {
    return NextResponse.json(
      { error: "Name, address line 1, city, postal code, and country are required" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const normalized = {
    name: String(name).trim(),
    line1: String(line1).trim(),
    line2: line2 ? String(line2).trim() : null,
    city: String(city).trim(),
    state: state ? String(state).trim() : null,
    postalCode: String(postalCode).trim(),
    country: String(country).trim(),
    phone: phone ? String(phone).trim() : null,
    isDefault: Boolean(isDefault),
  };

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Insert address.
    // - If it's the user's first address, auto default (NOT EXISTS).
    // - If duplicate (uq on user_id+line1+postal_code), return existing row (idempotent POST).
    const insertResult = await client.query(
      `
      INSERT INTO addresses (user_id, name, line1, line2, city, state, postal_code, country, phone, is_default)
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        (NOT EXISTS (SELECT 1 FROM addresses a WHERE a.user_id = $1))
      )
      ON CONFLICT (user_id, line1, postal_code)
      DO UPDATE SET
        name = EXCLUDED.name,
        line2 = EXCLUDED.line2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        phone = EXCLUDED.phone,
        updated_at = NOW()
      RETURNING *;
      `,
      [
        userId,
        normalized.name,
        normalized.line1,
        normalized.line2,
        normalized.city,
        normalized.state,
        normalized.postalCode,
        normalized.country,
        normalized.phone,
      ]
    );

    const address = insertResult.rows[0];

    // If user explicitly wants this address to be default, enforce it in the same transaction.
    // This avoids "no default" gaps and handles concurrency properly.
    if (normalized.isDefault) {
      await client.query(
        `UPDATE addresses
         SET is_default = CASE WHEN id = $2 THEN TRUE ELSE FALSE END
         WHERE user_id = $1`,
        [userId, address.id]
      );
      address.is_default = true;
    }

    await client.query("COMMIT");
    return NextResponse.json({ address }, { status: 201 });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("Error creating address:", e);

    // If you also have partial unique index for one default per user,
    // race conditions may surface as 23505. This turns into a clean error.
    if (e.code === "23505") {
      return NextResponse.json(
        { error: "Address conflict (duplicate or default constraint)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  } finally {
    client.release();
  }
}

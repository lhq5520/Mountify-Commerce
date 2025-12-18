import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db"; // IMPORTANT: use pool for transaction

// PUT - Update address
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const addressId = parseInt(id, 10);
  if (!Number.isFinite(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, line1, line2, city, state, postalCode, country, phone, isDefault } = body;

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

    // Verify ownership + lock the row to avoid concurrent updates fighting
    const existing = await client.query(
      `SELECT id, user_id, is_default
       FROM addresses
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [addressId, userId]
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Update the address fields first (do NOT blindly set is_default yet)
    const updatedResult = await client.query(
      `UPDATE addresses
       SET name = $1, line1 = $2, line2 = $3, city = $4, state = $5,
           postal_code = $6, country = $7, phone = $8, updated_at = NOW()
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        normalized.name,
        normalized.line1,
        normalized.line2,
        normalized.city,
        normalized.state,
        normalized.postalCode,
        normalized.country,
        normalized.phone,
        addressId,
        userId,
      ]
    );

    let address = updatedResult.rows[0];

    // If user wants this address to be default:
    // enforce "only one default per user" with a single statement
    if (normalized.isDefault) {
      await client.query(
        `UPDATE addresses
         SET is_default = CASE WHEN id = $2 THEN TRUE ELSE FALSE END,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId, addressId]
      );

      address.is_default = true;
    }

    await client.query("COMMIT");
    return NextResponse.json({ address });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("Error updating address:", e);

    // Handle unique conflicts (dedupe index or one-default-per-user index)
    if (e.code === "23505") {
      return NextResponse.json(
        { error: "Address conflict (duplicate or default constraint)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE - Delete address
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const addressId = parseInt(id, 10);
  if (!Number.isFinite(addressId)) {
    return NextResponse.json({ error: "Invalid address ID" }, { status: 400 });
  }

  const userId = session.user.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete only if owned by user; return the deleted row
    const delResult = await client.query(
      `DELETE FROM addresses
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [addressId, userId]
    );

    if (delResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const deleted = delResult.rows[0];

    // If deleted address was default, choose a replacement deterministically (latest)
    if (deleted.is_default) {
      const pickResult = await client.query(
        `SELECT id
         FROM addresses
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      const newDefaultId = pickResult.rows[0]?.id;

      if (newDefaultId) {
        await client.query(
          `UPDATE addresses
           SET is_default = CASE WHEN id = $2 THEN TRUE ELSE FALSE END,
               updated_at = NOW()
           WHERE user_id = $1`,
          [userId, newDefaultId]
        );
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, deleted });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("Error deleting address:", e);

    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  } finally {
    client.release();
  }
}

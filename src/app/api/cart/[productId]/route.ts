import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { query } from "@/lib/db";

// DELETE /api/cart/:productId - Remove specific product from cart
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { productId } = await params;
    const productIdNum = parseInt(productId);

    if (isNaN(productIdNum)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // Delete specific item from cart
    const result = await query(
      "DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [userId, productIdNum]
    );

    return NextResponse.json(
      { message: "Item removed from cart" },
      { status: 200 }
    );

  } catch (e: any) {
    console.error("Error removing from cart:", e);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
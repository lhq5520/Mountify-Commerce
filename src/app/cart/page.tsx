"use client";

import { useState } from "react";
import { useCart } from "@/app/context/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = cart.reduce(
    (sum, item) => sum + item.priceCad * item.quantity,
    0
  );

  async function handleCheckout() {
    if (cart.length === 0) {
      setMessage("Cart is empty.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // test email
          email: "test@example.com",
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            priceCad: item.priceCad,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to create order.");
        return;
      }

      setMessage(
        `Order created! ID: ${data.orderId}, total $${data.total.toFixed(
          2
        )} CAD`
      );
      clearCart();
    } catch (e) {
      setMessage("Network error during checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "20px" }}>
      <h1>Shopping Cart</h1>

      <ul>
        {cart.map((item) => (
          <li key={item.id}>
            <b>{item.name}</b> — {item.quantity} * ${item.priceCad} CAD
            <button onClick={() => removeFromCart(item.id)}>Remove</button>
          </li>
        ))}
      </ul>

      <hr />
      <p>Total: ${total.toFixed(2)} CAD</p>

      <button onClick={handleCheckout} disabled={loading}>
        {loading ? "Processing..." : "Checkout"}
      </button>

      <button
        onClick={clearCart}
        disabled={loading}
        style={{ marginLeft: "8px" }}
      >
        Clear Cart
      </button>

      {message && <p style={{ marginTop: "12px" }}>{message}</p>}
    </main>
  );
}

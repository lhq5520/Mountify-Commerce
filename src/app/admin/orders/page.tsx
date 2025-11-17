"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  email: string | null;
  total_cad: string;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders);
    }
    load();
  }, []);

  return (
    <main style={{ padding: "20px" }}>
      <h1>Orders (Admin)</h1>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <ul>
          {orders.map((o) => (
            <li key={o.id}>
              #{o.id} — {o.email ?? "No email"} — $
              {parseFloat(o.total_cad).toFixed(2)} —{" "}
              {new Date(o.created_at).toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

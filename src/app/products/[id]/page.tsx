"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Product {
  id: number;
  name: string;
  priceCad: number;
  car: string;
  description: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Failed to load product");
          setProduct(null);
        } else {
          const data = await res.json();
          setProduct(data.product);
          setError(null);
        }
      } catch (e) {
        setError("Network error");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <main style={{ padding: "20px" }}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>
        <b>Car:</b> {product.car}
      </p>
      <p>${product.priceCad.toFixed(2)} CAD</p>
    </main>
  );
}

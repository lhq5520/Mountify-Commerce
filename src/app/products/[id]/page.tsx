// Goal: show single page description
// Data: from /api/products, pull all products and filter out coresponding id

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

  useEffect(() => {
    if (!id) {
      return;
    }
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        const final = data.products.find((p: Product) => p.id === Number(id));
        setProduct(final);
      });
  }, [id]);

  if (!product) {
    return <p>Loading...</p>;
  }

  return (
    <main style={{ padding: "20px" }}>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>
        <b>Car:</b> {product.car}
      </p>
      <p>${product.priceCad} CAD</p>
    </main>
  );
}

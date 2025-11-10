// Goal: 显示 /api/products 返回的产品列表
// Data: 从 /api/products 获取
// Action: 暂时无动作，只是显示

"use client";

import { useEffect, useState } from "react";

// TODO: 定义一个 Product 类型（可以先用 any 顶着）
// type Product = { ... };
interface Product {
  id: number;
  name: string;
  priceCad: number;
  car: string;
  description: string;
}

export default function ProductsPage() {
  // TODO: useState 存产品列表
  const [productList, setProductList] = useState<Product[]>([]);

  // TODO: useEffect 里 fetch("/api/products")，拿到 data.products 后 setState
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setProductList(data.products);
      });
  }, []);

  return (
    <main>
      <h1>Products</h1>
      {/* TODO: 用 products.map 渲染列表 */}
      {productList.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p>${product.priceCad} CAD</p>
          <p>
            <b>Car:</b> {product.car}
          </p>
        </div>
      ))}
    </main>
  );
}

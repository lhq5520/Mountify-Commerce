"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Product } from "../types"; // If you don't have types.ts yet, comment this out

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  showToast: boolean;
  toastMessage: string;
  setShowToast: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  //new update for toast component instead of raw "alert"
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        // If already exists, increment quantity by 1
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      // Otherwise, add as new item
      return [...prev, { ...product, quantity: 1 }];
    });
    //new update for toast component
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        showToast,
        toastMessage,
        setShowToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Custom hook: makes it easier for components to use the cart
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

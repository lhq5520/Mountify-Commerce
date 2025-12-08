"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import type { Product } from "../types";
import { useSession } from "next-auth/react";

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

  // step 4c- cart persistent get login status
  const { data: session, status } = useSession();

  //step 4c
  // Load cart from database when user logs in
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchCartFromDatabase();
    } else if (status === "unauthenticated") {
      // User logged out → clear cart
      setCart([]);
    }
  }, [session?.user?.id, status]);

  //step 4c - grab cart data from database
  // Fetch cart from database
  async function fetchCartFromDatabase() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        throw new Error("Failed to fetch cart");
      }
      const data = await res.json();
      setCart(data.cart || []);
    } catch (e) {
      console.error("Error loading cart:", e);
      // Keep local cart on error and not revert for better user experience
      // UI and database will sync once refresh even error occur
    }
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      //original step1: update UI even API failed
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

    // new updated in step4c- Step 2: If logged in, sync to database
    if (session?.user?.id) {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      }).catch((e) => {
        console.error("Failed to sync cart to database:", e);
        // Don't rollback - user will see correct data on refresh
      });
    }

    //new update 4a - for toast component
    setToastMessage(`${product.name} added to cart`);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((p) => p.id !== id));

    // updated in Step4c: If logged in, sync to database
    if (session?.user?.id) {
      fetch(`/api/cart/${id}`, {
        method: "DELETE",
      }).catch((e) => {
        console.error("Failed to remove from cart:", e);
      });
    }
  };

  const clearCart = () => {
    setCart([]);

    // updated in Step4c: If logged in, sync to database
    if (session?.user?.id) {
      fetch("/api/cart", {
        method: "DELETE",
      }).catch((e) => {
        console.error("Failed to clear cart:", e);
      });
    }
  };

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

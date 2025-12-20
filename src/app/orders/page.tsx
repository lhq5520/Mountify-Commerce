"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, ShoppingBag, Truck, ExternalLink } from "lucide-react";
import {
  CARRIERS,
  getTrackingUrl,
  getStatusText,
  getStatusColor,
} from "@/lib/tracking";

type CarrierCode = keyof typeof CARRIERS;

interface OrderItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

interface Order {
  id: number;
  email: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  // 物流信息
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  trackingDetails: any | null;
  shippingName: string | null;
  shippingAddress: any | null;
}

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router]);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders/my-orders");

      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await res.json();
      setOrders(data.orders);
    } catch (e) {
      console.error(e);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  // 获取订单状态显示
  function getOrderStatusBadge(order: Order) {
    const status = order.status;

    if (status === "delivered") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
          Delivered
        </span>
      );
    }

    if (status === "shipped") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
          <Truck size={12} />
          Shipped
        </span>
      );
    }

    if (status === "paid") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          Processing
        </span>
      );
    }

    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
          Pending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
        {status}
      </span>
    );
  }

  // Loading state
  if (status === "loading" || loading) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14">
          <div className="mb-8">
            <div className="h-8 w-32 rounded bg-gray-200 animate-pulse mb-2" />
            <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Package size={20} className="text-[var(--color-text-secondary)]" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Order History
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            My Orders
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            View and track all your orders
          </p>
        </header>

        {/* Empty state */}
        {orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 py-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag size={28} className="text-gray-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
              No orders yet
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">
              Start shopping to see your orders here
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* Orders List */}
        {orders.length > 0 && (
          <div className="space-y-6">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden"
              >
                {/* Order Header */}
                <div className="px-5 py-4 bg-gray-50 border-b border-[var(--color-border)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Order
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          #{order.id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Date
                        </p>
                        <p className="text-sm text-[var(--color-text-primary)]">
                          {new Date(order.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Total
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          ${order.total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>{getOrderStatusBadge(order)}</div>
                  </div>
                </div>

                {/* Tracking Info (if shipped) */}
                {order.trackingNumber && order.carrier && (
                  <div className="px-5 py-3 bg-purple-50 border-b border-purple-100">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Truck size={18} className="text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-600 font-medium">
                            {CARRIERS[order.carrier as CarrierCode]?.name ||
                              order.carrier}
                          </p>
                          <a
                            href={getTrackingUrl(
                              order.carrier as CarrierCode,
                              order.trackingNumber
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:underline"
                          >
                            {order.trackingNumber}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        {order.trackingDetails && (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              order.trackingDetails.status
                            )}`}
                          >
                            {getStatusText(order.trackingDetails.status)}
                          </span>
                        )}
                        {order.shippedAt && (
                          <p className="text-xs text-purple-600 mt-1">
                            Shipped{" "}
                            {new Date(order.shippedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="px-5 py-4">
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.id}-${item.productId}-${idx}`}
                        className="flex items-center gap-4"
                      >
                        {/* Product Image */}
                        {item.imageUrl && (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                            Qty: {item.quantity} × ${item.price.toFixed(2)}
                          </p>
                        </div>

                        {/* Item Total */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            ${(item.quantity * item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

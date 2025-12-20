"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Package,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { useToast } from "@/app/context/ToastContext";
import {
  CARRIERS,
  getTrackingUrl,
  getStatusText,
  getStatusColor,
} from "@/lib/tracking";

type CarrierCode = keyof typeof CARRIERS;

type OrderItem = {
  productId: number;
  productName: string;
  imageUrl: string;
  quantity: number;
  price: string;
};

type Order = {
  id: number;
  email: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  trackingDetails: any | null;
  trackingLastSync: string | null;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: any | null;
};

export default function AdminShippingPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [filter, setFilter] = useState<
    "all" | "paid" | "shipped" | "delivered"
  >("all");

  // Ship modal
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState<CarrierCode>("ups");
  const [shipping, setShipping] = useState(false);

  // Refresh
  const [refreshingId, setRefreshingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/admin/shipping");
      if (!res.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setError(null);
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      setError("Failed to load orders");
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }

  function openShipModal(order: Order) {
    setSelectedOrder(order);
    setTrackingNumber("");
    setCarrier("ups");
    setShipModalOpen(true);
  }

  async function handleShip() {
    if (!selectedOrder || !trackingNumber.trim()) {
      showToast("Please enter tracking number", "error");
      return;
    }

    setShipping(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          carrier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to ship order", "error");
        return;
      }

      showToast("Order shipped successfully!", "success");
      setShipModalOpen(false);
      fetchOrders();
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setShipping(false);
    }
  }

  async function refreshTracking(orderId: number) {
    setRefreshingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to refresh", "error");
        return;
      }

      showToast("Tracking updated", "success");
      fetchOrders();
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setRefreshingId(null);
    }
  }

  function formatAddress(addr: any): string {
    if (!addr) return "N/A";
    const parts = [
      addr.line1,
      addr.line2,
      addr.city,
      addr.state,
      addr.postal_code,
      addr.country,
    ];
    return parts.filter(Boolean).join(", ");
  }

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const paidCount = orders.filter((o) => o.status === "paid").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  if (loading) {
    return (
      <div className="container-custom py-10 md:py-14">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] rounded-2xl bg-gray-200 animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-10 md:py-14">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck size={20} className="text-[var(--color-text-secondary)]" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Admin Panel
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Shipping
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Manage order fulfillment and tracking
          </p>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <button
          onClick={() => setFilter(filter === "paid" ? "all" : "paid")}
          className={`rounded-2xl p-5 shadow-sm border text-left transition-colors ${
            filter === "paid"
              ? "bg-gray-50 border-black/20"
              : "bg-white border-[var(--color-border)] hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{paidCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Awaiting Shipment
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFilter(filter === "shipped" ? "all" : "shipped")}
          className={`rounded-2xl p-5 shadow-sm border text-left transition-colors ${
            filter === "shipped"
              ? "bg-gray-50 border-black/20"
              : "bg-white border-[var(--color-border)] hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100">
              <Truck size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{shippedCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                In Transit
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() =>
            setFilter(filter === "delivered" ? "all" : "delivered")
          }
          className={`rounded-2xl p-5 shadow-sm border text-left transition-colors ${
            filter === "delivered"
              ? "bg-gray-50 border-black/20"
              : "bg-white border-[var(--color-border)] hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{deliveredCount}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Delivered
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Showing: <span className="font-medium capitalize">{filter}</span>
          </span>
          <button
            onClick={() => setFilter("all")}
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Orders */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              {filter === "all"
                ? "No orders to fulfill"
                : `No ${filter} orders`}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    Order #{order.id}
                  </p>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      order.status === "paid"
                        ? "bg-blue-100 text-blue-700"
                        : order.status === "shipped"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  <p className="font-semibold">${order.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-3 gap-6">
                {/* Items */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
                    Items ({order.items.length})
                  </p>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
                    Ship To
                  </p>
                  {order.shippingName ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{order.shippingName}</p>
                      {order.shippingPhone && (
                        <p className="text-[var(--color-text-secondary)]">
                          {order.shippingPhone}
                        </p>
                      )}
                      <p className="text-[var(--color-text-secondary)]">
                        {formatAddress(order.shippingAddress)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      No address
                    </p>
                  )}
                </div>

                {/* Tracking / Action */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
                    Tracking
                  </p>

                  {order.status === "paid" ? (
                    <button
                      onClick={() => openShipModal(order)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      <Truck size={16} />
                      Add Tracking
                    </button>
                  ) : order.trackingNumber ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
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
                        className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                      >
                        {order.trackingNumber}
                        <ExternalLink size={12} />
                      </a>

                      {order.trackingDetails && (
                        <p
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            order.trackingDetails.status
                          )}`}
                        >
                          {getStatusText(order.trackingDetails.status)}
                        </p>
                      )}

                      {order.shippedAt && (
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          Shipped: {new Date(order.shippedAt).toLocaleString()}
                        </p>
                      )}

                      <button
                        onClick={() => refreshTracking(order.id)}
                        disabled={refreshingId === order.id}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        <RefreshCw
                          size={12}
                          className={
                            refreshingId === order.id ? "animate-spin" : ""
                          }
                        />
                        {refreshingId === order.id
                          ? "Refreshing..."
                          : "Refresh"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      No tracking info
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ship Modal */}
      {shipModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShipModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={() => setShipModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-2">
              Ship Order #{selectedOrder.id}
            </h2>

            {selectedOrder.shippingName && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{selectedOrder.shippingName}</p>
                    <p className="text-[var(--color-text-secondary)]">
                      {formatAddress(selectedOrder.shippingAddress)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Carrier
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value as CarrierCode)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl focus:border-[var(--color-primary)] focus:outline-none"
                >
                  {Object.entries(CARRIERS).map(([code, info]) => (
                    <option key={code} value={code}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-xl focus:border-[var(--color-primary)] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShipModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-[var(--color-border)] rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShip}
                disabled={shipping || !trackingNumber.trim()}
                className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {shipping ? "Shipping..." : "Confirm Shipment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

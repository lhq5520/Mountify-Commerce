// Page for successful checkout
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  // State management
  const [status, setStatus] = useState<string>("pending");
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      return;
    }

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      // If already successful or exceeded limit, stop
      if (!isMounted) return;

      try {
        setAttemptCount((prev) => {
          const newCount = prev + 1;

          // If exceeded 15 attempts, stop
          if (newCount >= 15) {
            clearInterval(timerId);
          }

          return newCount;
        });

        const res = await fetch(`/api/orders/session/${sessionId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || "Failed to fetch order");
          return;
        }

        // Clear previous error
        setError(null);

        setStatus(data.status);
        setOrderId(data.orderId);

        // If paid, stop polling
        if (data.status === "paid") {
          clearInterval(timerId);
        }
      } catch (e) {
        if (isMounted) {
          setError("Network error");
        }
      }
    };

    // Execute immediately once
    checkOrderStatus();

    // Start timer
    timerId = setInterval(checkOrderStatus, 2000);

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [sessionId]); // Only depend on sessionId

  return (
    <main style={{ padding: "20px" }}>
      <h1>Payment Status</h1>

      {!sessionId && (
        <div>
          <p>❌ No session ID found. Invalid access.</p>
        </div>
      )}

      {error && (
        <div style={{ color: "red" }}>
          <p>❌ Error: {error}</p>
        </div>
      )}

      {status === "paid" && (
        <div style={{ color: "green" }}>
          <h2>✅ Payment Successful!</h2>
          <p>Your order has been confirmed.</p>
          <p>Order ID: {orderId}</p>
        </div>
      )}

      {status === "pending" && attemptCount < 15 && (
        <div>
          <p>⏳ Waiting to confirm your order status...</p>
          <p>Attempt {attemptCount} of 15</p>
        </div>
      )}

      {status === "pending" && attemptCount >= 15 && (
        <div style={{ color: "orange" }}>
          <p>⚠️ We are not able to confirm your payment status at this time.</p>
          <p>
            Please check your email for order confirmation or contact support.
          </p>
        </div>
      )}
    </main>
  );
}

//toast component

"use client";

import { useEffect } from "react";
import { CheckCircle, X } from "lucide-react";
import { useCart } from "@/app/context/CartContext";

export default function Toast() {
  const { showToast, toastMessage, setShowToast } = useCart();

  // Auto-hide on ESC key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && showToast) {
        setShowToast(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showToast, setShowToast]);

  if (!showToast) return null;

  return (
    <>
      {/* Backdrop (optional, for emphasis) */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
      />

      {/* Toast Card */}
      <div className="fixed top-20 right-6 z-50 animate-slideInRight">
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl min-w-[320px]"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Success Icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
            <CheckCircle size={20} className="text-green-600" />
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Success
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {toastMessage}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowToast(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close notification"
          >
            <X size={16} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </div>
    </>
  );
}

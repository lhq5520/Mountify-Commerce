// Logistics tracking service - supports 17track API, degrades to manual mode

export const CARRIERS = {
  ups: { name: "UPS", trackingUrl: "https://www.ups.com/track?tracknum=" },
  usps: { name: "USPS", trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=" },
  fedex: { name: "FedEx", trackingUrl: "https://www.fedex.com/fedextrack/?trknbr=" },
  dhl: { name: "DHL", trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=" },
  canadapost: { name: "Canada Post", trackingUrl: "https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=" },
} as const;

export type CarrierCode = keyof typeof CARRIERS;

export interface TrackingEvent {
  date: string;
  status: string;
  location?: string;
  description: string;
}

export interface TrackingInfo {
  status: "pending" | "in_transit" | "out_for_delivery" | "delivered" | "exception" | "unknown";
  estimatedDelivery?: string;
  events: TrackingEvent[];
  lastUpdated: string;
}

// Get tracking URL from carrier website
export function getTrackingUrl(carrier: CarrierCode, trackingNumber: string): string {
  const carrierInfo = CARRIERS[carrier];
  if (!carrierInfo) return "";
  return `${carrierInfo.trackingUrl}${trackingNumber}`;
}

// Fetch tracking info from 17track API
export async function fetchTrackingInfo(
  carrier: CarrierCode,
  trackingNumber: string
): Promise<TrackingInfo | null> {
  const apiKey = process.env.TRACK17_API_KEY;
  
  // No API key, return null (degrade to manual mode)
  if (!apiKey) {
    console.log("No 17track API key, using manual mode");
    return null;
  }

  try {
    // 17track API v2
    const response = await fetch("https://api.17track.net/track/v2/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": apiKey,
      },
      body: JSON.stringify([
        {
          number: trackingNumber,
          carrier: get17trackCarrierCode(carrier),
        },
      ]),
    });

    if (!response.ok) {
      console.error("17track API error:", response.status);
      return null;
    }

    await response.json();
    
    // After registration, query tracking info
    const trackResponse = await fetch("https://api.17track.net/track/v2/gettrackinfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": apiKey,
      },
      body: JSON.stringify([{ number: trackingNumber }]),
    });

    // Debug: verify API response status
    //console.log("17track gettrackinfo status:", trackResponse.status);

    if (!trackResponse.ok) {
      return null;
    }

    const trackData = await trackResponse.json();

    // Debug: log 17track response
    //console.log("17track response:", JSON.stringify(trackData, null, 2));

    return parseTrackingResponse(trackData);
  } catch (error) {
    console.error("Failed to fetch tracking info:", error);
    return null;
  }
}

// 17track carrier code mapping
function get17trackCarrierCode(carrier: CarrierCode): number {
  switch (carrier) {
    case "usps":
      // USPS code 21051 works fine
      return 21051;

    // Let 17track auto-detect decide in case of mismatch
    case "ups":
      return 100002;
    case "fedex":
    case "dhl":
    case "canadapost":
    default:
      return 0;
  }
}


// Parse 17track response
function parseTrackingResponse(data: any): TrackingInfo | null {
  try {
    const accepted = data?.data?.accepted?.[0];
    if (!accepted) {
      console.log("No accepted tracking data");
      return null;
    }

    const trackInfo = accepted.track_info;
    if (!trackInfo) {
      console.log("No track_info in response");
      return null;
    }

    // Extract events list
    const events: TrackingEvent[] = [];
    const providers = trackInfo.tracking?.providers || [];
    for (const provider of providers) {
      for (const event of provider.events || []) {
        events.push({
          date: event.time_utc || event.time_raw || "",
          status: event.stage || "",
          location: event.location || "",
          description: event.description || "",
        });
      }
    }

    // Status mapping
    const latestStatus = trackInfo.latest_status?.status || "Unknown";
    let status: TrackingInfo["status"] = "unknown";
    
    switch (latestStatus.toLowerCase()) {
      case "delivered":
        status = "delivered";
        break;
      case "intransit":
      case "transit":
        status = "in_transit";
        break;
      case "outfordelivery":
        status = "out_for_delivery";
        break;
      case "exception":
      case "expired":
      case "undelivered":
        status = "exception";
        break;
      case "notfound":
      case "pending":
        status = "pending";
        break;
      default:
        status = "unknown";
    }

    // Estimated delivery date
    const estimatedDelivery = trackInfo.time_metrics?.estimated_delivery_date?.from || undefined;

    return {
      status,
      estimatedDelivery,
      events,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Failed to parse tracking response:", e);
    return null;
  }
}

// Status display text
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    in_transit: "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    exception: "Exception",
    unknown: "Unknown",
  };
  return statusMap[status] || status;
}

// Status color
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: "text-gray-600 bg-gray-100",
    in_transit: "text-blue-600 bg-blue-100",
    out_for_delivery: "text-orange-600 bg-orange-100",
    delivered: "text-green-600 bg-green-100",
    exception: "text-red-600 bg-red-100",
    unknown: "text-gray-600 bg-gray-100",
  };
  return colorMap[status] || "text-gray-600 bg-gray-100";
}
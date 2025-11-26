import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Initialize client with credentials from environment variables
// We expect GOOGLE_APPLICATION_CREDENTIALS_JSON to contain the full JSON key content
const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
const propertyId = process.env.GA_PROPERTY_ID;

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

if (credentialsJson) {
  try {
    const credentials = JSON.parse(credentialsJson);
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials,
    });
  } catch (error) {
    console.error("Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON", error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (!analyticsDataClient || !propertyId) {
    console.warn("Missing GA credentials or Property ID");
    // Return mock data if not configured (for development/demo purposes)
    return res.status(200).json({
      activeUsers: 0,
      totalUsers: 0,
      isMock: true,
      message: "Backend not configured with GA credentials",
    });
  }

  try {
    // Run report for active users in the last 30 days
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: "30daysAgo",
          endDate: "today",
        },
      ],
      metrics: [
        {
          name: "activeUsers",
        },
      ],
    });

    const activeUsers = response.rows?.[0]?.metricValues?.[0]?.value || "0";

    // Optional: Run another report for total users all time (if needed)
    // For now, let's just return active users (last 30 days) as "Visitor Count"

    return res.status(200).json({
      activeUsers: parseInt(activeUsers, 10),
      period: "30d",
    });
  } catch (error) {
    console.error("Error fetching GA data:", error);
    return res.status(500).json({ error: "Failed to fetch analytics data" });
  }
}

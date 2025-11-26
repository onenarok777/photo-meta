import React, { useEffect, useState } from "react";

interface VisitorData {
  activeUsers: number;
  period?: string;
  isMock?: boolean;
}

export const VisitorCounter: React.FC = () => {
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchVisitorCount = async () => {
      try {
        // In development (Vite), /api might not be proxied unless configured.
        // In production (Vercel), it works automatically.
        const response = await fetch("/api/visitor-count");
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.warn("Error fetching visitor count (using mock data):", err);
        // Fallback to mock data for development/preview
        setData({
          activeUsers: 1234,
          period: "30d",
          isMock: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVisitorCount();
  }, []);

  if (error) return null; // Hide if error

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-lg flex items-center gap-3 hover:bg-black/50 transition-colors">
        <div className="relative">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-purple-300 uppercase tracking-wider font-bold leading-none">
            Visitors (30d)
          </span>
          <span className="text-sm font-bold text-white leading-none mt-1">
            {loading ? (
              <span className="animate-pulse">...</span>
            ) : (
              data?.activeUsers.toLocaleString()
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

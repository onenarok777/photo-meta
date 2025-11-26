import React, { useEffect, useState } from "react";

interface VisitorData {
  totalUsers: number;
  period?: string;
  isMock?: boolean;
}

export const VisitorCounter: React.FC = () => {
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState(false);

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
          totalUsers: 1234,
          period: "all-time",
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
    <div className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-purple-500/30 rounded-full pl-2 pr-5 py-1.5 transition-all duration-300">
      {/* Icon Container */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-300">
        <svg
          className="w-4 h-4 text-purple-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      {/* Text Content */}
      <div className="flex flex-col">
        <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider leading-none mb-0.5">
          Total Users
        </span>
        <span className="text-sm font-bold text-white leading-none font-mono">
          {loading ? (
            <span className="animate-pulse">...</span>
          ) : (
            data?.totalUsers.toLocaleString()
          )}
        </span>
      </div>
    </div>
  );
};

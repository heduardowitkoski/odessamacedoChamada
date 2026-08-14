import React from "react";

export function Badge({ children, variant = "teal" }: { children: React.ReactNode; variant?: string }) {
  const s: Record<string, string> = {
    teal: "bg-teal-100 text-teal-700",
    green: "bg-green-100 text-green-700",
    orange: "bg-orange-100 text-orange-700",
    yellow: "bg-yellow-100 text-yellow-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    pink: "bg-pink-100 text-pink-700",
    social: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s[variant] || s.teal}`}>
      {children}
    </span>
  );
}

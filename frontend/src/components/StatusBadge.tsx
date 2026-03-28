"use client";

import type { Status } from "@/hooks/useDeepgram";

const config: Record<Status, { color: string; label: string }> = {
  idle: { color: "bg-gray-400", label: "Idle" },
  connecting: { color: "bg-yellow-400 animate-pulse", label: "Connecting…" },
  listening: {
    color: "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]",
    label: "Listening",
  },
  error: { color: "bg-red-400", label: "Error" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { color, label } = config[status];
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

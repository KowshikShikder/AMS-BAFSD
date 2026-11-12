"use client";

import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants";

export default function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.applied;
  return (
    <span
      className="status-seal"
      style={{
        background: c.bg,
        color: c.text,
        borderColor: c.border,
      }}
    >
      <span className="status-seal__dot" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

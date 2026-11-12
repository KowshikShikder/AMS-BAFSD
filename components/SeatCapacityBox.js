"use client";

import { useEffect, useState } from "react";
import { VERSION_ABBREV, SHIFT_ABBREV, SHIFTS, seatStatusStyle } from "@/lib/constants";

function formatStatus(n) {
  if (n === undefined || n === null) return "—";
  return n > 0 ? `+${n}` : `${n}`;
}

export default function SeatCapacityBox({ version, studentClass }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ version, class: studentClass });
    fetch(`/api/seats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setRows(data.items || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version, studentClass]);

  if (loading) return null;
  if (!rows || rows.length === 0) return null;

  const abbrev = VERSION_ABBREV[version] || version;
  const heading = `${abbrev}-${studentClass}`;

  return (
    <div
      style={{
        border: "1.5px solid var(--color-rule-strong)",
        borderRadius: 8,
        padding: "14px 18px",
        margin: "16px 0",
        background: "#fbf9f3",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--color-ink-faint)",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Seat / Section — {heading}
      </div>
      <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
        {SHIFTS.map((shiftName) => {
          const row = rows.find((r) => r.shift === shiftName);
          return (
            <div key={shiftName} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                {SHIFT_ABBREV[shiftName] || shiftName}
              </div>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 13 }}>
                <div>
                  <span
                    className="text-muted"
                    style={{ fontSize: 10.5, textTransform: "uppercase", display: "block" }}
                  >
                    Section
                  </span>
                  <strong>{row ? row.totalSection : "—"}</strong>
                </div>
                <div>
                  <span
                    className="text-muted"
                    style={{ fontSize: 10.5, textTransform: "uppercase", display: "block" }}
                  >
                    Sup(+) Vac(-)
                  </span>
                  <strong
                    className="seat-pill"
                    style={row ? seatStatusStyle(row.status) : undefined}
                  >
                    {row ? formatStatus(row.status) : "—"}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

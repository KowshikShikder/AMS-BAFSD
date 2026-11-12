"use client";

import { useEffect, useState, Fragment } from "react";
import { VERSIONS, SHIFTS, CLASSES, VERSION_ABBREV, SHIFT_ABBREV, seatStatusStyle } from "@/lib/constants";

// Build the initial empty grid: one row per class, one {status,totalSection}
// cell per Version×Shift combo (4 combos: BV Morning, BV Day, EV Morning, EV Day)
function emptyGrid() {
  const grid = {};
  CLASSES.forEach((cls) => {
    grid[cls] = {};
    VERSIONS.forEach((v) => {
      SHIFTS.forEach((s) => {
        grid[cls][`${v}__${s}`] = { status: "", totalSection: "" };
      });
    });
  });
  return grid;
}

export default function SeatsPage() {
  const [grid, setGrid] = useState(emptyGrid());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/seats")
      .then((r) => r.json())
      .then((data) => {
        const next = emptyGrid();
        (data.items || []).forEach((row) => {
          if (next[row.class]) {
            const key = `${row.version}__${row.shift}`;
            if (next[row.class][key]) {
              next[row.class][key] = {
                status: String(row.status ?? ""),
                totalSection: String(row.totalSection ?? ""),
              };
            }
          }
        });
        setGrid(next);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateCell(cls, key, field, value) {
    setGrid((prev) => ({
      ...prev,
      [cls]: {
        ...prev[cls],
        [key]: { ...prev[cls][key], [field]: value },
      },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setMessage(null);
    try {
      const rows = [];
      CLASSES.forEach((cls) => {
        VERSIONS.forEach((v) => {
          SHIFTS.forEach((s) => {
            const cell = grid[cls][`${v}__${s}`];
            rows.push({
              version: v,
              shift: s,
              class: cls,
              status: cell.status === "" ? 0 : Number(cell.status),
              totalSection: cell.totalSection === "" ? 0 : Number(cell.totalSection),
            });
          });
        });
      });
      const res = await fetch("/api/seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage({ ok: true, text: `Saved ${data.saved} combinations.` });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const combos = [];
  VERSIONS.forEach((v) => SHIFTS.forEach((s) => combos.push({ version: v, shift: s, key: `${v}__${s}` })));

  return (
    <div>
      <span className="eyebrow">Registry Configuration</span>
      <h1 className="page-title">Seat &amp; Section Capacity</h1>
      <p className="page-subtitle">
        For every Version × Shift × Class enter the total sections and the Sup(+) Vac(-) figure:
        a <strong>negative</strong> number means vacant seats (green — deeper green as it gets more
        negative) and a <strong>positive</strong> number means surplus / over-seated (red — deeper
        red as it grows). Zero is white. This feeds the seat box shown on each application&apos;s detail view.
      </p>

      {message && (
        <div className={`alert ${message.ok ? "alert-success" : "alert-error"}`} style={{ marginBottom: 16 }}>
          {message.text}
        </div>
      )}

      <div className="card seat-scroll" style={{ overflowX: "auto", padding: 4 }}>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <table className="ledger seat-table">
            <thead>
              <tr>
                <th className="sticky-col">Class</th>
                {combos.map((c) => (
                  <th key={c.key} colSpan={2} style={{ textAlign: "center" }}>
                    {VERSION_ABBREV[c.version] || c.version} · {SHIFT_ABBREV[c.shift] || c.shift}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky-col"></th>
                {combos.map((c) => (
                  <Fragment key={c.key}>
                    <th>Section</th>
                    <th>Sup(+) Vac(-)</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cls) => (
                <tr key={cls}>
                  <td className="mono sticky-col" style={{ fontWeight: 700 }}>{cls}</td>
                  {combos.map((c) => {
                    const cell = grid[cls][c.key];
                    return (
                      <Fragment key={c.key}>
                        <td>
                          <input
                            type="number"
                            value={cell.totalSection}
                            onChange={(e) => updateCell(cls, c.key, "totalSection", e.target.value)}
                            style={{ width: 56, padding: "5px 6px", fontSize: 12.5, border: "1px solid var(--color-rule-strong)", borderRadius: 4 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={cell.status}
                            onChange={(e) => updateCell(cls, c.key, "status", e.target.value)}
                            className="seat-input"
                            style={{ ...seatStatusStyle(cell.status), fontWeight: 600 }}
                          />
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn btn-accent" onClick={handleSaveAll} disabled={saving || loading}>
          {saving ? "Saving…" : "Save All"}
        </button>
      </div>
    </div>
  );
}

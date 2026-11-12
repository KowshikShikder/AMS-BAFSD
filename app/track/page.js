"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import Brand from "@/components/Brand";
import {
  APPLICATION_TYPE_LABELS,
  APPLICATION_TYPE_FIELDS,
} from "@/lib/constants";

const FIELD_LABELS = {
  version: "Version",
  shift: "Shift",
  class: "Class",
  reqShift: "Requested Shift",
  reqVersion: "Requested Version",
  subject: "Subject",
  requirement: "Requirement",
  name: "Name",
  category: "Category",
};

function TrackContent() {
  const searchParams = useSearchParams();
  const [serial, setSerial] = useState(searchParams.get("id") || "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [application, setApplication] = useState(null);

  async function handleSearch(e) {
    e?.preventDefault();
    if (!serial.trim() || !phone.trim()) return;
    setLoading(true);
    setError("");
    setApplication(null);
    try {
      const url = `/api/track/${encodeURIComponent(serial.trim())}?phone=${encodeURIComponent(phone.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setApplication(data.application);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fields = application ? APPLICATION_TYPE_FIELDS[application.type] || [] : [];

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-header__inner">
          <Brand />
          <nav className="nav-links">
            <a href="/">Apply</a>
            <a href="/track">Track Status</a>
            <a href="/admin/login">Staff Login</a>
          </nav>
        </div>
      </header>

      <main className="container container--narrow">
        <span className="eyebrow">Check Status</span>
        <h1 className="page-title">Track your application</h1>
        <p className="page-subtitle">Enter the Serial Number you received at submission.</p>

        <form className="card card--pad" onSubmit={handleSearch} style={{ marginBottom: 24 }}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="serialNo">Serial Number</label>
            <input
              id="serialNo"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="e.g. 270001"
              style={{ fontFamily: "var(--font-mono)" }}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile Number (used at submission)</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              required
            />
          </div>
          <p className="text-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
            For privacy, both the Serial Number and the mobile number used at submission are required.
          </p>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-error">{error}</div>}

        {application && (
          <div className="card card--pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {APPLICATION_TYPE_LABELS[application.type]} · Serial {application.appSl}
                </div>
                <h2 style={{ fontSize: 20, marginTop: 2 }}>{application.name || application.subject}</h2>
              </div>
              <StatusBadge status={application.status} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "6px 20px",
                margin: "18px 0",
                fontSize: 13.5,
              }}
            >
              {fields
                .filter((f) => application[f])
                .map((f) => (
                  <div key={f}>
                    <span className="text-muted">{FIELD_LABELS[f] || f}: </span>
                    <strong>{application[f]}</strong>
                  </div>
                ))}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--color-rule)", margin: "20px 0" }} />

            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Status Timeline</h3>
            <div className="timeline">
              {[...(application.statusHistory || [])].reverse().map((h, idx) => (
                <div className="timeline-item" key={idx}>
                  <div className="timeline-item__title">
                    <StatusBadge status={h.status} />
                  </div>
                  <div className="timeline-item__meta">
                    {new Date(h.changedAt).toLocaleString()}
                    {h.changedByName ? ` · by ${h.changedByName}` : ""}
                  </div>
                  {h.note && <div className="timeline-item__note">{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import StatusBadge from "@/components/StatusBadge";
import ApplicationDetailModal from "@/components/ApplicationDetailModal";
import {
  APPLICATION_TYPES,
  APPLICATION_TYPE_LABELS,
  STATUS_ORDER,
  STATUS_LABELS,
  HEADLINE_STATUSES,
  VERSION_ABBREV,
  SHIFT_ABBREV,
  VERSIONS,
  SHIFTS,
  CLASSES,
} from "@/lib/constants";

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState(APPLICATION_TYPES.ADMISSION); // admission by default
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [shift, setShift] = useState("");
  const [cls, setCls] = useState("");
  const [q, setQ] = useState("");
  const [marksView, setMarksView] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [user, setUser] = useState(null);
  const [copiedRow, setCopiedRow] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user));
  }, []);

  const canChangeStatus = user
    ? ["super_admin", "admin_principal", "admin_office"].includes(user.role)
    : false;
  const canManageData = user ? user.role === "super_admin" : false;

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [type, status, version, shift, cls, q, marksView]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (version) params.set("version", version);
    if (shift) params.set("shift", shift);
    if (cls) params.set("class", cls);
    if (q) params.set("q", q);
    if (marksView) {
      params.set("sort", "marks");
      params.set("order", "desc");
    }
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    const res = await fetch(`/api/applications?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setStatusCounts(data.statusCounts || {});
    setLoading(false);
  }, [type, status, version, shift, cls, q, marksView, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id) {
    setSelectedId(id);
    const res = await fetch(`/api/applications/${id}`);
    const data = await res.json();
    if (res.ok) setSelectedApp(data.application);
  }

  function closeDetail() {
    setSelectedId(null);
    setSelectedApp(null);
  }

  function handleUpdated(updated) {
    setItems((prev) => prev.map((it) => (it._id === updated._id ? { ...it, ...updated } : it)));
    setSelectedApp(updated);
  }

  function handleCopyLink(e, serial, id) {
    e.stopPropagation();
    const url = `${window.location.origin}/track?id=${encodeURIComponent(serial)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedRow(id);
      setTimeout(() => setCopiedRow(null), 1800);
    });
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/applications/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult({ kind: "data", ...data });
      load();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  async function handleLookup(e) {
    e?.preventDefault();
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await fetch(`/api/applications/lookup?id=${encodeURIComponent(lookupId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setSelectedId(data.application._id);
      setSelectedApp(data.application);
      setLookupId("");
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">Registry</span>
      <h1 className="page-title">Applications</h1>
      <p className="page-subtitle">
        {total} total application(s) on file.
        {user && user.role === "entry" && " Showing only entries you submitted."}
      </p>

      <div className="stat-row">
        {HEADLINE_STATUSES.map((s) => (
          <button
            type="button"
            className={`stat-card stat-card--click ${status === s ? "active" : ""}`}
            key={s}
            onClick={() => setStatus((cur) => (cur === s ? "" : s))}
            aria-pressed={status === s}
            title={status === s ? "Click to show all" : `Show only ${STATUS_LABELS[s]}`}
          >
            <div className="stat-card__num">{statusCounts[s] ?? 0}</div>
            <div className="stat-card__label">{STATUS_LABELS[s]}</div>
          </button>
        ))}
      </div>

      <form
        onSubmit={handleLookup}
        className="card card--pad"
        style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}
      >
        <div className="field" style={{ flex: "1 1 260px", marginBottom: 0 }}>
          <label htmlFor="lookupId">Find &amp; Update by Serial No</label>
          <input
            id="lookupId"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="e.g. 270001"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={lookupLoading}>
          {lookupLoading ? "Searching…" : "Open"}
        </button>
        {lookupError && (
          <span className="text-muted" style={{ color: "#991B1B", fontSize: 13 }}>
            {lookupError}
          </span>
        )}
      </form>

      <div className="toolbar">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All Types</option>
          {Object.values(APPLICATION_TYPES).map((t) => (
            <option key={t} value={t}>
              {APPLICATION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select value={version} onChange={(e) => setVersion(e.target.value)}>
          <option value="">All Versions</option>
          {VERSIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">All Shifts</option>
          {SHIFTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="">All Classes</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          placeholder="Search name, phone, serial…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 200 }}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
          <input type="checkbox" checked={marksView} onChange={(e) => setMarksView(e.target.checked)} />
          Marks-wise list
        </label>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canManageData && (
            <>
              <a
                className="btn btn-ghost btn-sm"
                href={`/api/applications/export${type || status ? "?" : ""}${type ? `type=${type}&` : ""}${
                  status ? `status=${status}` : ""
                }`}
              >
                Export Excel
              </a>
              <a className="btn btn-ghost btn-sm" href="/api/applications/import-template">
                Download Import Template
              </a>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? "Importing…" : "Batch Import / Update"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={handleImportFile}
              />
            </>
          )}
        </div>
      </div>

      {importResult && (
        <div className={`alert ${importResult.error ? "alert-error" : "alert-success"}`} style={{ marginBottom: 14 }}>
          {importResult.error
            ? importResult.error
            : `Created ${importResult.created}, updated ${importResult.updated} application(s).${
                importResult.errors?.length ? ` ${importResult.errors.length} row(s) skipped — see console.` : ""
              }`}
          {importResult.errors?.length > 0 && console.log("Import errors:", importResult.errors)}
        </div>
      )}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">No applications match these filters.</div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Ver</th>
                <th>Shift</th>
                <th>Type</th>
                <th>Name / Subject</th>
                <th>Class</th>
                <th>Category</th>
                <th>Reference</th>
                {marksView && <th>Marks</th>}
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it._id} onClick={() => openDetail(it._id)}>
                  <td className="mono">{it.appSl}</td>
                  <td>
                    {it.version ? (
                      <span className={`ver-chip ver-${VERSION_ABBREV[it.version] || ""}`}>
                        {VERSION_ABBREV[it.version] || it.version}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{SHIFT_ABBREV[it.shift] || it.shift || "—"}</td>
                  <td>{APPLICATION_TYPE_LABELS[it.type]}</td>
                  <td>{it.name || it.subject || "—"}</td>
                  <td>{it.class || "—"}</td>
                  <td>{it.category || "—"}</td>
                  <td>{it.reference || "—"}</td>
                  {marksView && (
                    <td className="mono">{it.examMarks ?? "—"}</td>
                  )}
                  <td>
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="text-muted">{new Date(it.createdAt).toLocaleDateString()}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => handleCopyLink(e, it.appSl, it._id)}
                      >
                        {copiedRow === it._id ? "Copied!" : "Copy Link"}
                      </button>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={`/api/applications/${it._id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Prev
          </button>
          <span className="text-muted" style={{ fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {selectedId && selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          canEdit={canChangeStatus}
          onClose={closeDetail}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

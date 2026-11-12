"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";
import DocumentUpload from "./DocumentUpload";
import SeatCapacityBox from "./SeatCapacityBox";
import {
  APPLICATION_TYPE_LABELS,
  APPLICATION_TYPE_FIELDS,
  STATUS_ORDER,
  STATUS_LABELS,
} from "@/lib/constants";

const FIELD_LABELS = {
  version: "Version",
  shift: "Shift",
  class: "Class",
  group: "Group",
  studentId: "Student ID",
  reqShift: "Requested Shift",
  reqVersion: "Requested Version",
  subject: "Subject",
  requirement: "Requirement",
  name: "Name",
  guardianName: "Guardian Name",
  category: "Category",
  remarks: "Remarks",
  reference: "Reference",
};

// The primary fields, in the exact order/pairing requested:
// Name / Reference, Version / Shift, Class / Category — always shown even
// when blank ("—"). Everything else (Guardian Name, Group, Student ID,
// Subject, Requirement, Remarks, Mobile, Entered by) follows below, shown
// only when present.
const PRIMARY_FIELDS = ["name", "reference", "version", "shift", "class", "category"];

function Section({ children }) {
  return (
    <>
      <hr style={{ border: "none", borderTop: "1px solid var(--color-rule)", margin: "18px 0" }} />
      {children}
    </>
  );
}

export default function ApplicationDetailModal({ application, canEdit, onClose, onUpdated }) {
  const [status, setStatus] = useState(application.status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState(application.documents || []);
  const [copied, setCopied] = useState(false);
  const [marks, setMarks] = useState(
    application.examMarks === null || application.examMarks === undefined
      ? ""
      : String(application.examMarks)
  );
  const [savingMarks, setSavingMarks] = useState(false);
  const [marksError, setMarksError] = useState("");

  const fields = APPLICATION_TYPE_FIELDS[application.type] || [];
  const secondaryFields = fields.filter(
    (f) => !PRIMARY_FIELDS.includes(f) && application[f]
  );

  async function handleSaveStatus() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${application._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      onUpdated(data.application);
      setNote("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/track?id=${encodeURIComponent(application.appSl)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSaveMarks() {
    setSavingMarks(true);
    setMarksError("");
    try {
      const res = await fetch(`/api/applications/${application._id}/marks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examMarks: marks === "" ? null : Number(marks) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save marks");
      onUpdated(data.application);
    } catch (err) {
      setMarksError(err.message);
    } finally {
      setSavingMarks(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <span className="eyebrow">
              {APPLICATION_TYPE_LABELS[application.type]} · Serial {application.appSl}
            </span>
            <h2 style={{ fontSize: 20, marginTop: 2 }}>{application.name || application.subject || "—"}</h2>
            <div className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, marginTop: 2 }}>
              {application.appSl}
            </div>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
          <button className="btn btn-ghost btn-sm" onClick={handleCopyLink}>
            {copied ? "Link copied!" : "Copy tracking link"}
          </button>
          <a
            className="btn btn-ghost btn-sm"
            href={`/api/applications/${application._id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
        </div>

        {/* Primary fields: Name / Reference, Version / Shift, Class / Category */}
        <div className="detail-grid">
          {PRIMARY_FIELDS.map((f) => (
            <div key={f}>
              <span className="text-muted">{FIELD_LABELS[f] || f}: </span>
              <strong>{application[f] || "—"}</strong>
            </div>
          ))}
          <div>
            <span className="text-muted">Exam Marks: </span>
            <strong>
              {application.examMarks === null || application.examMarks === undefined
                ? "Not entered"
                : application.examMarks}
            </strong>
          </div>
        </div>

        {/* Any other applicable fields (Guardian Name, Group, Student ID, etc.) */}
        {(secondaryFields.length > 0 || application.phone || application.enteredByName) && (
          <div className="detail-grid" style={{ marginTop: -4 }}>
            {secondaryFields.map((f) => (
              <div key={f}>
                <span className="text-muted">{FIELD_LABELS[f] || f}: </span>
                <strong>{application[f]}</strong>
              </div>
            ))}
            {application.phone && (
              <div>
                <span className="text-muted">Mobile: </span>
                <strong>{application.phone}</strong>
              </div>
            )}
            {application.enteredByName && (
              <div>
                <span className="text-muted">Entered by: </span>
                <strong>{application.enteredByName}</strong>
                {application.manualAppSl && <span className="text-muted"> (manual App Sl)</span>}
              </div>
            )}
          </div>
        )}

        {application.version && application.class && (
          <SeatCapacityBox version={application.version} studentClass={application.class} />
        )}

        {canEdit && (
          <Section>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Update Status</h3>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="field-grid" style={{ marginBottom: 12 }}>
              <div className="field">
                <label htmlFor="detailStatus">New Status</label>
                <select id="detailStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="detailNote">Note (optional)</label>
                <input
                  id="detailNote"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / comment"
                />
              </div>
            </div>
            <button className="btn btn-accent" onClick={handleSaveStatus} disabled={saving}>
              {saving ? "Saving…" : "Save Status"}
            </button>
          </Section>
        )}

        <Section>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Status Timeline</h3>
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
        </Section>

        <Section>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>Documents</h3>
          <DocumentUpload
            applicationId={application._id}
            documents={documents}
            onChange={setDocuments}
          />
        </Section>

        {canEdit && (
          <Section>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Update Exam Marks</h3>
            {marksError && (
              <div className="alert alert-error" style={{ marginBottom: 12 }}>
                {marksError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div className="field" style={{ maxWidth: 160 }}>
                <label htmlFor="examMarks">Marks</label>
                <input
                  id="examMarks"
                  type="number"
                  min="0"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="e.g. 78"
                />
              </div>
              <button className="btn btn-accent" onClick={handleSaveMarks} disabled={savingMarks}>
                {savingMarks ? "Saving…" : "Save Marks"}
              </button>
            </div>
          </Section>
        )}

        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

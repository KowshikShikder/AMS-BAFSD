"use client";

import { useState } from "react";
import {
  APPLICATION_TYPES,
  APPLICATION_TYPE_LABELS,
  APPLICATION_TYPE_FIELDS,
  GROUP_ELIGIBLE_CLASSES,
  GROUPS,
  VERSIONS,
  SHIFTS,
  CLASSES,
  CATEGORIES,
  DOCUMENT_TYPES,
} from "@/lib/constants";
import { prepareDocuments } from "@/lib/clientFiles";

const FIELD_META = {
  version: { label: "Version", options: VERSIONS },
  shift: { label: "Shift", options: SHIFTS },
  class: { label: "Class", options: CLASSES },
  studentId: { label: "Student ID", placeholder: "Existing student ID" },
  reqShift: { label: "Requested Shift", options: SHIFTS },
  reqVersion: { label: "Requested Version", options: VERSIONS },
  subject: { label: "Subject", placeholder: "e.g. Certificate correction" },
  requirement: { label: "Requirement", placeholder: "Describe what is needed", area: true },
  name: { label: "Applicant Name", placeholder: "Full name" },
  guardianName: { label: "Guardian Name", placeholder: "Father's / Mother's / Guardian's name" },
  category: { label: "Category", options: CATEGORIES },
  remarks: { label: "Remarks", placeholder: "Any additional note", area: true },
  reference: { label: "Reference", placeholder: "Referred by (optional)" },
};

function isGroupEligible(classValue) {
  return GROUP_ELIGIBLE_CLASSES.includes(String(classValue || "").trim().toUpperCase());
}

const TYPE_ORDER = [
  APPLICATION_TYPES.ADMISSION,
  APPLICATION_TYPES.SHIFT_CHANGE,
  APPLICATION_TYPES.VERSION_CHANGE,
  APPLICATION_TYPES.MISCELLANEOUS,
];

export default function ApplicationForm({ isStaffEntry = false }) {
  const [type, setType] = useState(APPLICATION_TYPES.ADMISSION);
  const [values, setValues] = useState({});
  const [phone, setPhone] = useState("");
  const [manualAppSl, setManualAppSl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  // staff entry: documents queued before the application is saved
  const [queuedDocs, setQueuedDocs] = useState([]);
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [docBusy, setDocBusy] = useState("");
  const [docError, setDocError] = useState("");

  const fields = APPLICATION_TYPE_FIELDS[type];

  function updateField(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function switchType(next) {
    setType(next);
    setValues({});
    setResult(null);
    setError("");
  }

  async function handleDocPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocError("");
    setDocBusy("Converting file…");
    try {
      const prepared = await prepareDocuments(file);
      setQueuedDocs((prev) => [
        ...prev,
        ...prepared.map((p) => ({ ...p, type: docType, key: `${Date.now()}-${Math.random()}` })),
      ]);
    } catch (err) {
      setDocError(err.message);
    } finally {
      setDocBusy("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const payload = { type, phone, ...values };
      if (isStaffEntry && manualAppSl.trim()) {
        payload.appSl = manualAppSl.trim();
      }
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }
      let docFailures = 0;
      for (const d of queuedDocs) {
        try {
          const r = await fetch(`/api/applications/${data.id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: d.type,
              fileName: d.fileName,
              mimeType: d.mimeType,
              dataBase64: d.dataBase64,
            }),
          });
          if (!r.ok) docFailures++;
        } catch {
          docFailures++;
        }
      }
      setResult({ ...data, docsUploaded: queuedDocs.length - docFailures, docFailures });
      setQueuedDocs([]);
      setValues({});
      setPhone("");
      setManualAppSl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="card card--pad">
        <span className="eyebrow">Submitted</span>
        <h2 style={{ fontSize: 22, marginBottom: 14 }}>Application received</h2>
        <p className="text-muted" style={{ marginBottom: 20 }}>
          Keep your Serial Number safe — it is also your tracking number, and you&apos;ll need it
          (with your mobile number) to check status later.
        </p>
        {result.docsUploaded > 0 && (
          <p className="text-muted" style={{ marginBottom: 14 }}>
            {result.docsUploaded} document(s) uploaded.
          </p>
        )}
        {result.docFailures > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            {result.docFailures} document(s) could not be uploaded — add them from the application popup.
          </div>
        )}
        <div
          style={{
            border: "1px dashed var(--color-rule-strong)",
            borderRadius: 8,
            padding: "16px 18px",
            marginBottom: 20,
          }}
        >
          <div className="text-muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Serial No (also your tracking number)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 600 }}>
            {result.appSl}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn btn-accent" href={`/track?id=${encodeURIComponent(result.appSl)}`}>
            Track this application
          </a>
          <button className="btn btn-ghost" onClick={() => setResult(null)}>
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="type-tabs">
        {TYPE_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={`type-tab ${t === type ? "active" : ""}`}
            onClick={() => switchType(t)}
          >
            {APPLICATION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <form className="card card--pad" onSubmit={handleSubmit}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        <div className="field-grid">
          {fields
            .filter((key) => key !== "group")
            .map((key) => {
              const meta = FIELD_META[key];
              return (
                <div className={`field ${meta.area ? "field--full" : ""}`} key={key}>
                  <label htmlFor={key}>{meta.label}</label>
                  {meta.area ? (
                    <textarea
                      id={key}
                      placeholder={meta.placeholder}
                      value={values[key] || ""}
                      onChange={(e) => updateField(key, e.target.value)}
                    />
                  ) : meta.options ? (
                    <select
                      id={key}
                      value={values[key] || ""}
                      onChange={(e) => updateField(key, e.target.value)}
                    >
                      <option value="">Select {meta.label.toLowerCase()}</option>
                      {meta.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={key}
                      type="text"
                      placeholder={meta.placeholder}
                      value={values[key] || ""}
                      onChange={(e) => updateField(key, e.target.value)}
                      required={key === "name"}
                    />
                  )}
                </div>
              );
            })}

          {type === APPLICATION_TYPES.ADMISSION && isGroupEligible(values.class) && (
            <div className="field">
              <label htmlFor="group">Group</label>
              <select
                id="group"
                value={values.group || ""}
                onChange={(e) => updateField("group", e.target.value)}
              >
                <option value="">Select group</option>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="field">
            <label htmlFor="phone">Mobile Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {isStaffEntry && (
            <div className="field">
              <label htmlFor="manualAppSl">Manual App Sl (optional)</label>
              <input
                id="manualAppSl"
                type="text"
                placeholder="Leave blank to auto-generate"
                value={manualAppSl}
                onChange={(e) => setManualAppSl(e.target.value)}
                style={{ fontFamily: "var(--font-mono)" }}
              />
            </div>
          )}
        </div>

        {isStaffEntry && (
          <div className="entry-docs">
            <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>Documents (optional)</h3>
            <p className="text-muted" style={{ fontSize: 12.5, margin: "0 0 12px" }}>
              Add any image or PDF, any size — it is shrunk to under 200 KB automatically (large PDFs
              become images).
            </p>
            {docError && (
              <div className="alert alert-error" style={{ marginBottom: 10 }}>
                {docError}
              </div>
            )}
            {queuedDocs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {queuedDocs.map((d) => (
                  <div className="doc-row" key={d.key}>
                    <div>
                      <strong>{d.type}</strong>
                      <span className="text-muted">
                        {" "}· {d.fileName} · {Math.round(d.size / 1024)} KB · {d.note}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setQueuedDocs((prev) => prev.filter((x) => x.key !== d.key))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="field" style={{ minWidth: 200 }}>
                <label htmlFor="entryDocType">Document Type</label>
                <select id="entryDocType" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="entryDocFile">Add File</label>
                <input
                  id="entryDocFile"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleDocPick}
                  disabled={!!docBusy || submitting}
                />
              </div>
            </div>
            {docBusy && <p className="text-muted" style={{ fontSize: 12.5, marginTop: 6 }}>{docBusy}</p>}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn btn-primary" type="submit" disabled={submitting || !!docBusy}>
            {submitting ? "Submitting…" : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
}

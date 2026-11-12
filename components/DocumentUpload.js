"use client";

import { useState } from "react";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { prepareDocuments } from "@/lib/clientFiles";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

// Upload panel for an EXISTING application (used inside the detail popup).
// Any image/PDF of any size can be picked — it is automatically converted to
// under 200 KB (PDF → image when needed) before being uploaded.
export default function DocumentUpload({ applicationId, documents, onChange }) {
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    setInfo("");
    try {
      setBusy("Converting file…");
      const prepared = await prepareDocuments(file);

      let latest = documents;
      for (let i = 0; i < prepared.length; i++) {
        setBusy(`Uploading ${i + 1} of ${prepared.length}…`);
        const p = prepared[i];
        const res = await fetch(`/api/applications/${applicationId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: docType,
            fileName: p.fileName,
            mimeType: p.mimeType,
            dataBase64: p.dataBase64,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        latest = data.documents;
        onChange(latest);
      }
      setInfo(
        prepared.length > 1
          ? `Added ${prepared.length} images (${prepared[0].note}).`
          : `Added (${prepared[0].note}, ${formatSize(prepared[0].size)}).`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete(docId) {
    try {
      const res = await fetch(`/api/applications/${applicationId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      onChange(documents.filter((d) => d._id !== docId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {info && (
        <div className="alert alert-success" style={{ marginBottom: 12 }}>
          {info}
        </div>
      )}

      {(documents || []).length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          No documents uploaded yet.
        </p>
      ) : (
        <div style={{ marginBottom: 14 }}>
          {documents.map((doc) => (
            <div className="doc-row" key={doc._id}>
              <div>
                <strong>{doc.type}</strong>
                <span className="text-muted"> · {doc.fileName} · {formatSize(doc.size)}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <a
                  className="icon-btn"
                  href={`/api/applications/${applicationId}/documents/${doc._id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
                <button className="icon-btn" onClick={() => handleDelete(doc._id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ minWidth: 200 }}>
          <label htmlFor="docType">Document Type</label>
          <select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="docFile">Add File (image or PDF, any size)</label>
          <input
            id="docFile"
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileChange}
            disabled={!!busy}
          />
        </div>
      </div>
      <p className="text-muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
        Files are automatically shrunk to under 200 KB (large PDFs become images).
      </p>
      {busy && <p className="text-muted" style={{ fontSize: 12.5, marginTop: 6 }}>{busy}</p>}
    </div>
  );
}

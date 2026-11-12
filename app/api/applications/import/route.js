import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import {
  APPLICATION_TYPES,
  APPLICATION_TYPE_FIELDS,
  canManageData,
  resolveApplicationType,
  resolveStatus,
} from "@/lib/constants";

export const runtime = "nodejs";

// Column headers this importer understands (case-insensitive, spacing-insensitive,
// matches the Excel export/template format so "export, edit, re-import" and the
// downloadable template both round-trip cleanly).
const COLUMN_MAP = {
  // Serial number — legacy headers (Tracking ID / App Sl) are still accepted
  serialno: "appSl",
  serial: "appSl",
  serialnumber: "appSl",
  trackingid: "appSl",
  appsl: "appSl",
  type: "type",
  name: "name",
  guardianname: "guardianName",
  class: "class",
  version: "version",
  shift: "shift",
  group: "group",
  studentid: "studentId",
  reqshift: "reqShift",
  reqversion: "reqVersion",
  subject: "subject",
  requirement: "requirement",
  category: "category",
  remarks: "remarks",
  reference: "reference",
  phone: "phone",
  status: "status",
  exammarks: "examMarks",
  marks: "examMarks",
};

// ExcelJS can hand back plain values, rich-text objects, formula results, or
// Date instances depending on how the cell was authored — normalize all of
// those down to a plain trimmed string.
function cellText(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if (Array.isArray(v.richText)) {
      return v.richText.map((t) => t.text).join("").trim();
    }
    if (v.result !== undefined) return String(v.result).trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v instanceof Date) return v.toISOString();
    return "";
  }
  return String(v).trim();
}

// POST /api/applications/import (PROTECTED — Super Admin only, enforced in middleware)
// Body: multipart/form-data with a single "file" field (.xlsx)
//
// Behavior: a row with a Serial No that matches an EXISTING
// application updates that record (including Status and Exam Marks, and
// pushes a status-history entry if the status changed). A row with no
// match (or no ID given) creates a new application — Status defaults to
// "Applied" only when the column is left blank, not overridden otherwise.
export async function POST(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !canManageData(auth.role)) {
      return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(arrayBuffer));
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return NextResponse.json({ error: "Workbook has no sheets" }, { status: 400 });
    }

    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      const key = cellText(cell).toLowerCase().replace(/\s+/g, "");
      headers[colNumber] = COLUMN_MAP[key] || null;
    });

    await dbConnect();

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (row.actualCellCount === 0) continue;

      const record = {};
      row.eachCell((cell, colNumber) => {
        const field = headers[colNumber];
        if (!field) return;
        const text = cellText(cell);
        if (text) record[field] = text;
      });

      if (Object.keys(record).length === 0) continue;

      // Resolve status up front (used for both create and update paths)
      let resolvedStatus = null;
      if (record.status) {
        resolvedStatus = resolveStatus(record.status);
        if (!resolvedStatus) {
          errors.push(`Row ${r}: invalid "status" (got "${record.status}")`);
          continue;
        }
      }

      const examMarks =
        record.examMarks !== undefined && record.examMarks !== ""
          ? Number(record.examMarks)
          : undefined;
      if (examMarks !== undefined && Number.isNaN(examMarks)) {
        errors.push(`Row ${r}: invalid "exam marks" (got "${record.examMarks}")`);
        continue;
      }

      // -----------------------------------------------------------------
      // UPDATE existing record when the row references one by ID
      // -----------------------------------------------------------------
      if (record.appSl) {
        const existing = await Application.findOne({ appSl: record.appSl });

        if (existing) {
          try {
            const allowedFields = APPLICATION_TYPE_FIELDS[existing.type] || [];
            for (const field of allowedFields) {
              if (record[field] !== undefined) existing[field] = record[field];
            }
            if (record.phone !== undefined) existing.phone = record.phone;
            if (examMarks !== undefined) {
              existing.examMarks = examMarks;
              existing.examMarksUpdatedBy = auth.sub;
              existing.examMarksUpdatedByName = auth.name;
              existing.examMarksUpdatedAt = new Date();
            }
            if (resolvedStatus && resolvedStatus !== existing.status) {
              existing.status = resolvedStatus;
              existing.statusHistory.push({
                status: resolvedStatus,
                changedBy: auth.sub,
                changedByName: auth.name,
                note: "Updated via batch import",
              });
            }
            await existing.save();
            updated++;
          } catch (err) {
            errors.push(`Row ${r}: ${err.message}`);
          }
          continue;
        }
        // No existing match — fall through to create, using the given ID.
      }

      // -----------------------------------------------------------------
      // CREATE a new application
      // -----------------------------------------------------------------
      const resolvedType = resolveApplicationType(record.type);
      if (!resolvedType) {
        errors.push(`Row ${r}: missing or invalid "type" (got "${record.type || ""}")`);
        continue;
      }

      const allowedFields = APPLICATION_TYPE_FIELDS[resolvedType];
      const doc = { type: resolvedType, phone: record.phone };
      for (const field of allowedFields) {
        if (record[field]) doc[field] = record[field];
      }
      if (record.appSl) doc.appSl = record.appSl;
      if (resolvedStatus) doc.status = resolvedStatus;
      if (examMarks !== undefined) doc.examMarks = examMarks;
      doc.enteredBy = auth.sub;
      doc.enteredByName = auth.name;

      if (!doc.name && resolvedType !== APPLICATION_TYPES.MISCELLANEOUS) {
        errors.push(`Row ${r}: missing "name"`);
        continue;
      }

      try {
        if (doc.appSl) {
          const clash = await Application.findOne({ appSl: doc.appSl }).lean();
          if (clash) {
            errors.push(`Row ${r}: App Sl "${doc.appSl}" already exists`);
            continue;
          }
        }
        await Application.create(doc);
        created++;
      } catch (err) {
        errors.push(`Row ${r}: ${err.message}`);
      }
    }

    return NextResponse.json({ created, updated, errors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to import file" }, { status: 500 });
  }
}

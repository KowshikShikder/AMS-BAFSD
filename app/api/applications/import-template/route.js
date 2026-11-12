import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAuthFromRequest } from "@/lib/auth";
import {
  canManageData,
  VERSIONS,
  SHIFTS,
  CLASSES,
  CATEGORIES,
  GROUPS,
  APPLICATION_TYPE_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";

export const runtime = "nodejs";

// A dropdown "list" data-validation formula in Excel must be a single
// comma-separated string under 255 characters — all our option sets are
// well within that.
function listFormula(values) {
  return [`"${values.join(",")}"`];
}

// GET /api/applications/import-template (PROTECTED — Super Admin only)
// Generates a blank .xlsx with the correct headers and dropdown validation
// on every fixed-choice column (Type, Version, Shift, Class, Group,
// Category, Status) so batch import never fails on case/spacing mismatches.
export async function GET(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !canManageData(auth.role)) {
      return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Import");

    const columns = [
      { header: "Serial No", key: "appSl", width: 14 },
      { header: "Type", key: "type", width: 16, list: Object.values(APPLICATION_TYPE_LABELS) },
      { header: "Name", key: "name", width: 20 },
      { header: "Guardian Name", key: "guardianName", width: 20 },
      { header: "Class", key: "class", width: 10, list: CLASSES },
      { header: "Version", key: "version", width: 12, list: VERSIONS },
      { header: "Shift", key: "shift", width: 12, list: SHIFTS },
      { header: "Group", key: "group", width: 14, list: GROUPS },
      { header: "Student ID", key: "studentId", width: 14 },
      { header: "Req Shift", key: "reqShift", width: 12, list: SHIFTS },
      { header: "Req Version", key: "reqVersion", width: 14, list: VERSIONS },
      { header: "Subject", key: "subject", width: 16 },
      { header: "Requirement", key: "requirement", width: 20 },
      { header: "Category", key: "category", width: 14, list: CATEGORIES },
      { header: "Remarks", key: "remarks", width: 24 },
      { header: "Reference", key: "reference", width: 18 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Status", key: "status", width: 16, list: Object.values(STATUS_LABELS) },
      { header: "Exam Marks", key: "examMarks", width: 12 },
    ];

    sheet.columns = columns.map(({ header, key, width }) => ({ header, key, width }));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEAD9" } };
    });

    const TEMPLATE_ROWS = 300; // enough blank validated rows to fill in

    columns.forEach((col, idx) => {
      if (!col.list || col.list.length === 0) return;
      const colLetter = sheet.getColumn(idx + 1).letter;
      for (let r = 2; r <= TEMPLATE_ROWS + 1; r++) {
        sheet.getCell(`${colLetter}${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: listFormula(col.list),
          showErrorMessage: true,
          errorTitle: "Invalid value",
          error: `Please choose one of: ${col.list.join(", ")}`,
        };
      }
    });

    // A short instructions sheet
    const notes = workbook.addWorksheet("Instructions");
    notes.columns = [{ width: 100 }];
    [
      "How to use this template:",
      "",
      "- Leave Serial No blank to CREATE a new application (a serial like 270001 is assigned automatically).",
      "- Fill in Serial No to UPDATE an existing application - any other",
      "  filled columns on that row (including Status and Exam Marks) will overwrite",
      "  the existing values; blank columns are left unchanged.",
      "- Type, Class, Version, Shift, Group, Category, and Status are dropdown-validated -",
      "  click the cell and choose from the list to avoid spelling/case mismatches.",
      "- Name is required for Admission / Shift Change / Version Change rows.",
      "- Status defaults to \"Applied\" for new rows if left blank.",
    ].forEach((line, i) => {
      notes.getCell(`A${i + 1}`).value = line;
      if (i === 0) notes.getCell(`A${i + 1}`).font = { bold: true, size: 13 };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="application-import-template.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}

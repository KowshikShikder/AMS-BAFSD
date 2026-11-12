import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import {
  APPLICATION_TYPE_LABELS,
  STATUS_LABELS,
  canManageData,
} from "@/lib/constants";

export const runtime = "nodejs";

// GET /api/applications/export  (PROTECTED - Super Admin only, enforced in middleware too)
export async function GET(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !canManageData(auth.role)) {
      return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const items = await Application.find(filter).sort({ createdAt: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Applications");

    sheet.columns = [
      { header: "Serial No", key: "appSl", width: 14 },
      { header: "Type", key: "type", width: 16 },
      { header: "Name", key: "name", width: 20 },
      { header: "Guardian Name", key: "guardianName", width: 20 },
      { header: "Class", key: "class", width: 10 },
      { header: "Group", key: "group", width: 14 },
      { header: "Version", key: "version", width: 12 },
      { header: "Shift", key: "shift", width: 12 },
      { header: "Student ID", key: "studentId", width: 14 },
      { header: "Req. Shift", key: "reqShift", width: 12 },
      { header: "Req. Version", key: "reqVersion", width: 14 },
      { header: "Subject", key: "subject", width: 16 },
      { header: "Requirement", key: "requirement", width: 20 },
      { header: "Category", key: "category", width: 14 },
      { header: "Remarks", key: "remarks", width: 24 },
      { header: "Reference", key: "reference", width: 18 },
      { header: "Status", key: "status", width: 14 },
      { header: "Exam Marks", key: "examMarks", width: 12 },
      { header: "Submitted At", key: "createdAt", width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    items.forEach((it) => {
      sheet.addRow({
        appSl: it.appSl,
        type: APPLICATION_TYPE_LABELS[it.type] || it.type,
        name: it.name || "",
        guardianName: it.guardianName || "",
        class: it.class || "",
        group: it.group || "",
        version: it.version || "",
        shift: it.shift || "",
        studentId: it.studentId || "",
        reqShift: it.reqShift || "",
        reqVersion: it.reqVersion || "",
        subject: it.subject || "",
        requirement: it.requirement || "",
        category: it.category || "",
        remarks: it.remarks || "",
        reference: it.reference || "",
        status: STATUS_LABELS[it.status] || it.status,
        examMarks: it.examMarks ?? "",
        createdAt: new Date(it.createdAt).toLocaleString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="applications-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

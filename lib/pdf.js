import PDFDocument from "pdfkit";
import {
  APPLICATION_TYPE_LABELS,
  STATUS_LABELS,
  APPLICATION_TYPE_FIELDS,
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

export function generateApplicationPDF(app) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("Application Receipt", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#555")
        .text("BAF Shaheen College Dhaka - Application Management System", { align: "center" });
      doc.moveDown(1.5);

      doc.fillColor("#000");
      doc.fontSize(12).font("Helvetica-Bold").text("Serial No (also your tracking number): ", {
        continued: true,
      });
      doc.font("Helvetica").text(app.appSl);

      doc.font("Helvetica-Bold").text("Type: ", { continued: true });
      doc.font("Helvetica").text(APPLICATION_TYPE_LABELS[app.type] || app.type);

      doc.font("Helvetica-Bold").text("Status: ", { continued: true });
      doc.font("Helvetica").text(STATUS_LABELS[app.status] || app.status);

      doc.font("Helvetica-Bold").text("Submitted: ", { continued: true });
      doc.font("Helvetica").text(new Date(app.createdAt).toLocaleString());

      doc.moveDown(1);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#ccc")
        .stroke();
      doc.moveDown(1);

      doc.fontSize(13).font("Helvetica-Bold").text("Details");
      doc.moveDown(0.5);

      const fields = APPLICATION_TYPE_FIELDS[app.type] || [];
      fields.forEach((key) => {
        const value = app[key];
        if (!value) return;
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${FIELD_LABELS[key] || key}: `, { continued: true });
        doc.font("Helvetica").text(String(value));
      });

      doc.moveDown(1.5);
      doc
        .fontSize(9)
        .fillColor("#888")
        .text(
          "This is a system-generated document. Use the serial number above with your mobile number to check live status online.",
          { align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

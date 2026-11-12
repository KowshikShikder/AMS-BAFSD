import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import { generateApplicationPDF } from "@/lib/pdf";

export const runtime = "nodejs";

// GET /api/applications/:id/pdf (PROTECTED)
export async function GET(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const application = await Application.findById(params.id).lean();
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const pdfBuffer = await generateApplicationPDF(application);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${application.appSl}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

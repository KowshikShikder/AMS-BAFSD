import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/applications/:id/documents/:docId (PROTECTED) — streams the raw file
export async function GET(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    await dbConnect();
    const application = await Application.findById(params.id).select("documents").lean();
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const doc = application.documents.find((d) => String(d._id) === params.docId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const buffer = Buffer.from(doc.dataBase64, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

// DELETE /api/applications/:id/documents/:docId (PROTECTED)
export async function DELETE(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    await dbConnect();
    const application = await Application.findById(params.id);
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    application.documents = application.documents.filter(
      (d) => String(d._id) !== params.docId
    );
    await application.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  ALLOWED_DOCUMENT_MIME_TYPES,
} from "@/lib/constants";

// POST /api/applications/:id/documents (PROTECTED)
// Body: { type, fileName, mimeType, dataBase64 }  (dataBase64 without the
// "data:...;base64," prefix — the client strips that before sending)
export async function POST(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { type, fileName, mimeType, dataBase64 } = await req.json();

    if (!DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Only PDF or image files (jpg, png, webp) are allowed" },
        { status: 400 }
      );
    }
    if (!dataBase64) {
      return NextResponse.json({ error: "No file data received" }, { status: 400 });
    }

    // Rough byte-size check from base64 length (base64 is ~4/3 the raw size)
    const approxBytes = Math.ceil((dataBase64.length * 3) / 4);
    if (approxBytes > MAX_DOCUMENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 200KB size limit" },
        { status: 400 }
      );
    }

    await dbConnect();
    const application = await Application.findById(params.id);
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    application.documents.push({
      type,
      fileName: fileName || "document",
      mimeType,
      size: approxBytes,
      dataBase64,
      uploadedBy: auth.sub,
      uploadedByName: auth.name,
    });
    await application.save();

    return NextResponse.json(
      { documents: application.documents.map(stripInlineData) },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}

// GET /api/applications/:id/documents (PROTECTED) — metadata only (no base64)
export async function GET(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    await dbConnect();
    const application = await Application.findById(params.id)
      .select("documents")
      .lean();
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ documents: application.documents.map(stripInlineData) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

function stripInlineData(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { dataBase64, ...rest } = obj;
  return rest;
}

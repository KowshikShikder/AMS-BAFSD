import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import { canViewAll } from "@/lib/constants";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/applications/lookup?id=<serial number>  (PROTECTED)
// Used by the dashboard's "Find & Update by Serial" box — finds one application
// by its serial number so staff can jump straight to editing it (status,
// marks, documents) without paging through the table.
export async function GET(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Provide a serial number" }, { status: 400 });
    }

    await dbConnect();
    const application = await Application.findOne({
      appSl: new RegExp(`^${escapeRegex(id)}$`, "i"),
    }).lean();

    if (!application) {
      return NextResponse.json(
        { error: `No application found for "${id}"` },
        { status: 404 }
      );
    }
    if (!canViewAll(auth.role) && String(application.enteredBy) !== auth.sub) {
      return NextResponse.json(
        { error: "Not authorized to view this application" },
        { status: 403 }
      );
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

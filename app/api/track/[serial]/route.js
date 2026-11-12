import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { toPublicStatus, PUBLIC_VISIBLE_STATUSES } from "@/lib/constants";

function normalizePhone(p) {
  return String(p || "").replace(/\D/g, "");
}

// GET /api/track/:serial?phone=...  (PUBLIC)
// The applicant's phone number must match the one on file — this prevents
// anyone from browsing other applicants' records with just a serial number.
export async function GET(req, { params }) {
  try {
    const serial = decodeURIComponent(params.serial || "").trim();
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";

    if (!serial) {
      return NextResponse.json({ error: "Serial number required" }, { status: 400 });
    }
    if (!normalizePhone(phone)) {
      return NextResponse.json(
        { error: "Mobile number is required to view application details" },
        { status: 400 }
      );
    }

    await dbConnect();
    const application = await Application.findOne({ appSl: serial })
      .select(
        "appSl type name class version shift group studentId reqShift reqVersion subject requirement category status statusHistory phone createdAt"
      )
      .lean();

    if (!application || normalizePhone(application.phone) !== normalizePhone(phone)) {
      return NextResponse.json(
        { error: "No application found matching that serial number and mobile number" },
        { status: 404 }
      );
    }

    // Collapse internal-only statuses (Seen, Short Listed) to "Applied" for
    // the public view, and hide the underlying internal status history.
    const publicApplication = {
      ...application,
      status: toPublicStatus(application.status),
      statusHistory: (application.statusHistory || [])
        .filter((h) => PUBLIC_VISIBLE_STATUSES.includes(h.status))
        .map((h) => ({ ...h, changedByName: undefined })), // don't expose staff names publicly
    };
    delete publicApplication.phone;

    return NextResponse.json({ application: publicApplication });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to track application" }, { status: 500 });
  }
}

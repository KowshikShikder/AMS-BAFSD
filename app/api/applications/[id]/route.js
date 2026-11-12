import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import ActivityLog from "@/models/ActivityLog";
import { getAuthFromRequest } from "@/lib/auth";
import { STATUS, canChangeStatus, canViewAll } from "@/lib/constants";
import { sendSMS, statusChangeMessage } from "@/lib/sms";

// GET /api/applications/:id (PROTECTED)
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
    if (!canViewAll(auth.role) && String(application.enteredBy) !== auth.sub) {
      return NextResponse.json({ error: "Not authorized to view this application" }, { status: 403 });
    }
    return NextResponse.json({ application });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH /api/applications/:id  (PROTECTED - staff/admin change status)
export async function PATCH(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!canChangeStatus(auth.role)) {
      return NextResponse.json(
        { error: "Your role cannot change application status" },
        { status: 403 }
      );
    }

    const { status, note } = await req.json();
    if (!Object.values(STATUS).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();
    const application = await Application.findById(params.id);
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const previousStatus = application.status;
    application.status = status;
    application.statusHistory.push({
      status,
      changedBy: auth.sub,
      changedByName: auth.name,
      note: note || "",
    });
    await application.save();

    await ActivityLog.create({
      user: auth.sub,
      userName: auth.name,
      action: "STATUS_CHANGE",
      application: application._id,
      appSl: application.appSl,
      meta: { from: previousStatus, to: status, note: note || "" },
    });

    // Fire-and-forget SMS notification (does not block the response on failure)
    sendSMS(application.phone, statusChangeMessage(application)).catch(() => {});

    return NextResponse.json({ application });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

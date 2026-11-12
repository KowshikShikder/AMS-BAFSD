import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import { canChangeStatus } from "@/lib/constants";

// PATCH /api/applications/:id/marks (PROTECTED — same roles allowed to change status)
export async function PATCH(req, { params }) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!canChangeStatus(auth.role)) {
      return NextResponse.json(
        { error: "Your role cannot update exam marks" },
        { status: 403 }
      );
    }

    const { examMarks } = await req.json();
    const marks = examMarks === null || examMarks === "" ? null : Number(examMarks);
    if (marks !== null && (Number.isNaN(marks) || marks < 0)) {
      return NextResponse.json({ error: "Marks must be a non-negative number" }, { status: 400 });
    }

    await dbConnect();
    const application = await Application.findByIdAndUpdate(
      params.id,
      {
        examMarks: marks,
        examMarksUpdatedBy: auth.sub,
        examMarksUpdatedByName: auth.name,
        examMarksUpdatedAt: new Date(),
      },
      { new: true }
    );
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update marks" }, { status: 500 });
  }
}

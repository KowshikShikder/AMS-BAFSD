import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Application from "@/models/Application";
import { getAuthFromRequest } from "@/lib/auth";
import {
  APPLICATION_TYPES,
  APPLICATION_TYPE_FIELDS,
  canViewAll,
  STATUS_ORDER,
  VERSIONS,
  CLASSES,
} from "@/lib/constants";

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// POST /api/applications
// PUBLIC when unauthenticated (applicant self-service submission).
// When authenticated (any role — everyone may enter applications), the
// submitter is recorded and, only in that case, a Manual App Sl is honored.
export async function POST(req) {
  try {
    const body = await req.json();
    const { type, phone, appSl } = body;

    if (!Object.values(APPLICATION_TYPES).includes(type)) {
      return NextResponse.json(
        { error: "Invalid application type" },
        { status: 400 }
      );
    }

    const allowedFields = APPLICATION_TYPE_FIELDS[type];
    const doc = { type, phone };
    for (const field of allowedFields) {
      if (body[field] !== undefined && body[field] !== "") {
        doc[field] = String(body[field]).trim();
      }
    }

    if (!doc.name && type !== APPLICATION_TYPES.MISCELLANEOUS) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const auth = await getAuthFromRequest(req);
    if (auth) {
      doc.enteredBy = auth.sub;
      doc.enteredByName = auth.name;
      // Manual App Sl is only ever honored for a logged-in submitter.
      if (appSl && String(appSl).trim()) {
        doc.appSl = String(appSl).trim();
      }
    }

    await dbConnect();

    if (doc.appSl) {
      const existing = await Application.findOne({ appSl: doc.appSl }).lean();
      if (existing) {
        return NextResponse.json(
          { error: `Serial "${doc.appSl}" is already in use` },
          { status: 409 }
        );
      }
    }

    const application = await Application.create(doc);

    return NextResponse.json(
      {
        id: application._id.toString(),
        appSl: application.appSl, // the single serial number, also the tracking number
        status: application.status,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

// GET /api/applications  (PROTECTED - admin/staff list with filters)
export async function GET(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const version = searchParams.get("version");
    const shift = searchParams.get("shift");
    const cls = searchParams.get("class");
    const phone = searchParams.get("phone");
    const q = searchParams.get("q");
    const sort = searchParams.get("sort"); // "marks" to sort by exam marks
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (version) filter.version = version;
    if (shift) filter.shift = shift;
    if (cls) filter.class = cls;
    if (phone) filter.phone = { $regex: escapeRegex(phone.replace(/\D/g, "")), $options: "i" };
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [
        { name: rx },
        { appSl: rx },
        { reference: rx },
        { studentId: rx },
        { phone: rx },
      ];
    }

    // Entry role only ever sees applications they personally submitted.
    // (ObjectId cast is required because the status breakdown below uses
    // aggregate(), which — unlike find() — does not cast strings.)
    if (!canViewAll(auth.role)) {
      filter.enteredBy = new mongoose.Types.ObjectId(auth.sub);
    }

    // Default list order ("serially"):
    //   Bangla Version KG→XII, then English Version KG→XII;
    //   inside each class: applications with a Reference first, then those
    //   with Remarks, then everything else; then by serial (entry) order.
    const rank = (list, field) => ({
      $let: {
        vars: { i: { $indexOfArray: [list, { $ifNull: [field, ""] }] } },
        in: { $cond: [{ $lt: ["$$i", 0] }, 99, "$$i"] },
      },
    });
    const hasText = (field) => ({
      $gt: [{ $strLenCP: { $ifNull: [field, ""] } }, 0],
    });
    const sortSpec =
      sort === "marks"
        ? { examMarks: order, _vRank: 1, _cRank: 1, createdAt: 1 }
        : { _vRank: 1, _cRank: 1, _bucket: 1, createdAt: 1, appSl: 1 };

    // Status breakdown across the FULL filtered set (not just the current
    // page) — this is what the dashboard's status count cards should show.
    const statusFilter = { ...filter };
    delete statusFilter.status;

    const [items, total, statusAgg] = await Promise.all([
      Application.aggregate([
        { $match: filter },
        {
          $addFields: {
            _vRank: rank(VERSIONS, "$version"),
            _cRank: rank(CLASSES, "$class"),
            _bucket: {
              $cond: [
                hasText("$reference"),
                0,
                { $cond: [hasText("$remarks"), 1, 2] },
              ],
            },
          },
        },
        { $sort: sortSpec },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _vRank: 0,
            _cRank: 0,
            _bucket: 0,
            "documents.dataBase64": 0,
          },
        },
      ]),
      Application.countDocuments(filter),
      Application.aggregate([
        { $match: statusFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = {};
    STATUS_ORDER.forEach((s) => {
      statusCounts[s] = 0;
    });
    statusAgg.forEach((row) => {
      statusCounts[row._id] = row.count;
    });

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      statusCounts,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

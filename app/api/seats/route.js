import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import SeatCapacity from "@/models/SeatCapacity";
import { getAuthFromRequest } from "@/lib/auth";
import { canManageSeats } from "@/lib/constants";

// GET /api/seats  (PROTECTED — any authenticated role)
// Optional ?version=&class= to filter (used by the detail-modal seat box,
// which wants both shifts for one version+class combo).
export async function GET(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const version = searchParams.get("version");
    const cls = searchParams.get("class");

    const filter = {};
    if (version) filter.version = version;
    if (cls) filter.class = cls;

    const items = await SeatCapacity.find(filter).lean();
    return NextResponse.json({ items });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch seat data" }, { status: 500 });
  }
}

// POST /api/seats  (PROTECTED — canManageSeats roles)
// Body: { rows: [{ version, shift, class, status, totalSection }, ...] }
// Upserts every row in one call — used by the admin seat-capacity grid's
// "Save All" button.
export async function POST(req) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || !canManageSeats(auth.role)) {
      return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
    }

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to save" }, { status: 400 });
    }

    await dbConnect();

    const ops = rows.map((row) => ({
      updateOne: {
        filter: { version: row.version, shift: row.shift, class: row.class },
        update: {
          $set: {
            status: Number(row.status) || 0,
            totalSection: Number(row.totalSection) || 0,
            updatedBy: auth.sub,
            updatedByName: auth.name,
          },
        },
        upsert: true,
      },
    }));

    await SeatCapacity.bulkWrite(ops);

    return NextResponse.json({ ok: true, saved: rows.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save seat data" }, { status: 500 });
  }
}

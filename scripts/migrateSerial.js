/* eslint-disable no-console */
// One-time migration for databases created BEFORE the single-serial change.
//
//   - Drops the old unique index on `trackingId` (it would reject new records)
//   - Renumbers every existing application to the new serial format
//     <APP_SESSION><4-digit sequence> (e.g. 270001), oldest first
//   - Keeps the old identifiers in `legacy.trackingId` / `legacy.appSl`
//   - Moves the serial counter forward so new applications continue after
//
// Safe by default: it only PRINTS what it would do. Add --yes to apply.
//
//   node scripts/migrateSerial.js          (dry run)
//   node scripts/migrateSerial.js --yes    (apply)
require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const apply = process.argv.includes("--yes");
  const session = String(process.env.APP_SESSION || "27").trim();
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Configure your .env file first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const apps = db.collection("applications");
  const counters = db.collection("counters");

  const docs = await apps
    .find({}, { projection: { appSl: 1, trackingId: 1, createdAt: 1 } })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  console.log(`Found ${docs.length} application(s). Session = ${session}`);
  if (docs.length === 0) console.log("Nothing to renumber.");

  const pad = (n) => String(n).padStart(4, "0");
  const plan = docs.map((d, i) => ({
    _id: d._id,
    oldTracking: d.trackingId,
    oldSl: d.appSl,
    next: `${session}${pad(i + 1)}`,
  }));
  plan.slice(0, 5).forEach((p) =>
    console.log(`  ${p.oldTracking || "-"} / ${p.oldSl || "-"}  ->  ${p.next}`)
  );
  if (plan.length > 5) console.log(`  ... and ${plan.length - 5} more`);

  if (!apply) {
    console.log("\nDry run only. Re-run with --yes to apply.");
    process.exit(0);
  }

  // 1) old unique index on trackingId
  try {
    await apps.dropIndex("trackingId_1");
    console.log("Dropped index trackingId_1");
  } catch (e) {
    console.log("No trackingId_1 index to drop (ok).");
  }

  // 2) renumber in two phases so unique(appSl) never collides mid-way
  if (plan.length) {
    await apps.bulkWrite(
      plan.map((p) => ({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { appSl: `__tmp__${p._id}` } },
        },
      }))
    );
    await apps.bulkWrite(
      plan.map((p) => ({
        updateOne: {
          filter: { _id: p._id },
          update: {
            $set: {
              appSl: p.next,
              legacy: { trackingId: p.oldTracking, appSl: p.oldSl },
            },
            $unset: { trackingId: "" },
          },
        },
      }))
    );
  }

  // 3) continue numbering after the last migrated serial
  await counters.updateOne(
    { name: `serial_${session}` },
    { $set: { seq: plan.length } },
    { upsert: true }
  );

  console.log(`\nDone. ${plan.length} application(s) renumbered.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

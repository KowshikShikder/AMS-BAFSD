import mongoose from "mongoose";
import { getNextSequence } from "./Counter";
import { APPLICATION_TYPES, STATUS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Single serial number — used everywhere (list, PDF, SMS) AND as the public
// tracking number. Format: <session><4-digit sequence>, e.g. session "27"
// → 270001, 270002 ... Set the session with APP_SESSION in .env.
// ---------------------------------------------------------------------------
export function currentSession() {
  return String(process.env.APP_SESSION || "27").trim();
}

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(STATUS), required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedByName: String,
    note: String,
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema({
  type: { type: String, required: true }, // one of DOCUMENT_TYPES
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }, // bytes
  dataBase64: { type: String, required: true }, // small files (<200KB) stored inline
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  uploadedByName: String,
  uploadedAt: { type: Date, default: Date.now },
});

const ApplicationSchema = new mongoose.Schema(
  {
    // The one and only serial / tracking number (e.g. "270001")
    appSl: { type: String, unique: true, index: true },
    type: {
      type: String,
      enum: Object.values(APPLICATION_TYPES),
      required: true,
    },

    // Common / shared fields across the 4 form types
    name: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    class: { type: String, trim: true },
    version: { type: String, trim: true },
    shift: { type: String, trim: true },
    group: { type: String, trim: true }, // Admission, only for class IX/X/XI/XII
    studentId: { type: String, trim: true }, // Shift Change / Version Change
    reqShift: { type: String, trim: true }, // Shift Change / Version Change
    reqVersion: { type: String, trim: true }, // Version Change
    subject: { type: String, trim: true }, // Miscellaneous
    requirement: { type: String, trim: true }, // Miscellaneous
    category: { type: String, trim: true },
    remarks: { type: String, trim: true },
    reference: { type: String, trim: true },

    // Applicant contact (used for public tracking + SMS notifications)
    phone: { type: String, trim: true },

    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.APPLIED,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    documents: { type: [DocumentSchema], default: [] },

    // Exam marks (entered one-by-one or via batch update)
    examMarks: { type: Number, default: null },
    examMarksUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    examMarksUpdatedByName: String,
    examMarksUpdatedAt: Date,

    // Who submitted this (null for public/applicant submissions)
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    enteredByName: String,
    manualAppSl: { type: Boolean, default: false }, // true if appSl was hand-entered by staff
  },
  { timestamps: true }
);

async function nextFreeSerial() {
  const session = currentSession();
  // A manually entered serial may already occupy the next number — skip over it.
  for (let i = 0; i < 1000; i++) {
    const seq = await getNextSequence(`serial_${session}`);
    const candidate = `${session}${String(seq).padStart(4, "0")}`;
    const taken = await mongoose.models.Application.exists({ appSl: candidate });
    if (!taken) return candidate;
  }
  throw new Error("Could not allocate a free serial number");
}

ApplicationSchema.pre("validate", async function assignIdentifiers(next) {
  try {
    if (this.isNew) {
      if (!this.appSl) {
        this.appSl = await nextFreeSerial();
      } else {
        this.manualAppSl = true;
      }
      if (this.statusHistory.length === 0) {
        this.statusHistory.push({
          status: this.status || STATUS.APPLIED,
          note: "Application submitted",
        });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);

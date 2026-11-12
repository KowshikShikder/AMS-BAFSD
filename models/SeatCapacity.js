import mongoose from "mongoose";

const SeatCapacitySchema = new mongoose.Schema(
  {
    version: { type: String, required: true, trim: true },
    shift: { type: String, required: true, trim: true },
    class: { type: String, required: true, trim: true },
    // Positive = vacant seats remaining, negative = over-seated
    status: { type: Number, default: 0 },
    totalSection: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedByName: String,
  },
  { timestamps: true }
);

SeatCapacitySchema.index({ version: 1, shift: 1, class: 1 }, { unique: true });

export default mongoose.models.SeatCapacity ||
  mongoose.model("SeatCapacity", SeatCapacitySchema);

import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    action: { type: String, required: true }, // e.g. "STATUS_CHANGE", "LOGIN"
    application: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    appSl: String,
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", ActivityLogSchema);

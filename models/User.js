import mongoose from "mongoose";
import { ROLES } from "@/lib/constants";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true }, // bcrypt hash
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.ENTRY,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// never leak password hash in API responses
UserSchema.methods.toSafeJSON = function toSafeJSON() {
  const { _id, name, email, role, active, createdAt } = this;
  return { id: _id.toString(), name, email, role, active, createdAt };
};

export default mongoose.models.User || mongoose.model("User", UserSchema);

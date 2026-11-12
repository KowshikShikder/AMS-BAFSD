/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function main() {
  const {
    MONGODB_URI,
    SEED_ADMIN_NAME = "Super Admin",
    SEED_ADMIN_EMAIL = "admin@example.com",
    SEED_ADMIN_PASSWORD = "Admin@12345",
    SEED_ADMIN_ROLE = "super_admin",
  } = process.env;

  const VALID_ROLES = [
    "super_admin",
    "admin_principal",
    "admin_office",
    "entry",
    "admin_officer",
  ];
  if (!VALID_ROLES.includes(SEED_ADMIN_ROLE)) {
    console.error(`SEED_ADMIN_ROLE must be one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set. Configure your .env file first.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const UserSchema = new mongoose.Schema(
    {
      name: String,
      email: { type: String, unique: true },
      password: String,
      role: { type: String, default: "staff" },
      active: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const existing = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log(`Admin user already exists: ${SEED_ADMIN_EMAIL}`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await User.create({
    name: SEED_ADMIN_NAME,
    email: SEED_ADMIN_EMAIL.toLowerCase(),
    password: hash,
    role: SEED_ADMIN_ROLE,
    active: true,
  });

  console.log("✅ User created:");
  console.log(`   Email:    ${SEED_ADMIN_EMAIL}`);
  console.log(`   Password: ${SEED_ADMIN_PASSWORD}`);
  console.log(`   Role:     ${SEED_ADMIN_ROLE}`);
  console.log("   Run again with different SEED_ADMIN_* env vars to add more users.");
  console.log("   Please change this password after first login.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

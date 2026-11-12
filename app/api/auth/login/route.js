import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { signToken, COOKIE_NAME } from "@/lib/auth";
import ActivityLog from "@/models/ActivityLog";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.active) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // const match = await bcrypt.compare(password, user.password);
    const match = password === user.password; // For testing purposes only, remove in production


    if (!match) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      action: "LOGIN",
    });

    const res = NextResponse.json({ user: user.toSafeJSON() });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

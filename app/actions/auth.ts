"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "7f5ae1278fd908819ab26c6d093b137e0c4a45a33c1f01c9a62ef3ff3c4372ab";
const key = new TextEncoder().encode(JWT_SECRET);

// JWT Encryption helpers
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

export async function decrypt(input: string) {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Log in a user (Admin, Employee, or Client)
 */
export async function login(state: any, formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { success: false, error: "Please enter both email and password." };
    }

    if (!db) {
      return { success: false, error: "Database is not connected. Please check configuration." };
    }

    // Find user in database
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.trim().toLowerCase()))
      .limit(1);

    if (existingUsers.length === 0) {
      return { success: false, error: "Invalid email or password." };
    }

    const user = existingUsers[0];

    // Check password
    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return { success: false, error: "Invalid email or password." };
    }

    // Generate JWT payload
    const sessionPayload = {
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };

    // Encrypt JWT
    const token = await encrypt(sessionPayload);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    // Save token in secure HTTP-only cookie
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return { 
      success: true, 
      user: { name: user.name, email: user.email, role: user.role },
      error: null 
    };
  } catch (error: any) {
    console.error("Login Server Action Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred during login." };
  }
}

/**
 * Log out the active user and clear session cookies
 */
export async function logout() {
  try {
    cookies().delete("token");
    revalidatePath("/admin", "layout");
    revalidatePath("/employee", "layout");
    revalidatePath("/client", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Logout Server Action Error:", error);
    return { success: false, error: "Logout failed." };
  }
}

/**
 * Create a new user (Admin-only action)
 */
export async function createUser(formData: FormData) {
  try {
    // 1. Verify caller session to ensure they are an Admin
    const token = cookies().get("token")?.value;
    if (!token) {
      return { success: false, error: "Unauthorized access." };
    }

    const payload = await decrypt(token);
    if (!payload || payload.role !== "admin") {
      return { success: false, error: "Unauthorized. Only administrators can create accounts." };
    }

    if (!db) {
      return { success: false, error: "Database not connected." };
    }

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as "admin" | "employee" | "client";
    const systemRole = (formData.get("systemRole") as string) || (role === "admin" ? "Admin" : "Web Developer");
    const workingDays = (formData.get("workingDays") as string) || "1,2,3,4,5";
    const shiftStartTime = (formData.get("shiftStartTime") as string) || "09:00 AM";
    const shiftEndTime = (formData.get("shiftEndTime") as string) || "05:00 PM";
    const activeShiftProfile = (formData.get("activeShiftProfile") as string) || "Standard Core Hours";

    if (!email || !password || !role) {
      return { success: false, error: "Email, password, and role are required." };
    }

    const name = email.split("@")[0];

    // 2. Check if email already exists
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.trim().toLowerCase()))
      .limit(1);

    if (existingUsers.length > 0) {
      return { success: false, error: "An account with this email address already exists." };
    }

    // 3. Hash password and insert
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(schema.users).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      systemRole,
      workingDays,
      shiftStartTime,
      shiftEndTime,
      activeShiftProfile,
    });

    // Fetch the newly created user's ID
    const newUser = await db.select({ id: schema.users.id }).from(schema.users)
      .where(eq(schema.users.email, email.trim().toLowerCase())).limit(1);
    const newUserId = newUser[0]?.id ?? null;

    console.log(`[Database] Account created by Admin: ${email} (${role} - ${systemRole})`);
    return { success: true, error: null, userId: newUserId };
  } catch (error: any) {
    console.error("CreateUser Server Action Error:", error);
    return { success: false, error: error.message || "Failed to create user account." };
  }
}

/**
 * Helper to fetch the current user's profile on the server side
 */
export async function getCurrentUser() {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    return payload; // Returns { id, name, email, role }
  } catch (error) {
    return null;
  }
}

/**
 * Uploads a profile avatar, updates the database, and re-issues the JWT
 */
export async function updateUserAvatar(formData: FormData) {
  try {
    const session = await getCurrentUser();
    if (!session) return { success: false, error: "Unauthorized" };
    if (!db) return { success: false, error: "Database not connected" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file provided" };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeName = `${session.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/avatars/${safeName}`;

    // Update DB
    await db.update(schema.users).set({ avatarUrl }).where(eq(schema.users.id, session.id as number));

    // Update JWT
    const newSessionPayload = {
      ...session,
      avatarUrl,
    };
    const token = await encrypt(newSessionPayload);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      sameSite: "lax",
      path: "/",
    });

    return { success: true, avatarUrl };
  } catch (e: any) {
    console.error("Avatar Upload Error:", e);
    return { success: false, error: e.message || "Failed to upload avatar" };
  }
}

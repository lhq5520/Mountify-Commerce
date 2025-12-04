// api/auth/register/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    
    // Step 1: Validate inputs exist
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Step 2: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Step 3: Validate password strength (at least 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    
    // Step 4: Check if email already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    
    // Step 5: Hash password (10 salt rounds - standard security)
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Step 6: Insert new user into database
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, passwordHash]
    );
    
    const newUser = result.rows[0];
    
    // Step 7: Return success
    return NextResponse.json(
      { 
        message: "User created successfully",
        user: { 
          id: newUser.id, 
          email: newUser.email,
          createdAt: newUser.created_at
        }
      },
      { status: 201 }
    );
    
  } catch (e: any) {
    console.error("Registration error:", e);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
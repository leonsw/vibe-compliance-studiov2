import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Root Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Uses the Super Admin key
);

// GET: List all users (Debug Version)
export async function GET() {
  try {
    console.log("--- ADMIN DEBUG START ---");
    
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    // 1. Check for Key Identity Crisis
    if (serviceKey === anonKey) {
        console.error("CRITICAL ERROR: Service Key is identical to Anon Key. You cannot list users with the Anon Key.");
        return NextResponse.json({ error: "Configuration Error: Service Key is actually Anon Key" }, { status: 500 });
    }

    console.log("Key Check Passed: Service Key is distinct from Anon Key.");

    // 2. Initialize Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Attempt Fetch
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error("Supabase API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Success! Retrieved ${data.users.length} users.`);
    return NextResponse.json({ users: data.users });

  } catch (error: any) {
    console.error("Server Crash:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// POST: Provision (Invite) a user
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    
    if (error) throw error;

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// PUT: Update a user's role
export async function PUT(req: Request) {
    try {
      const { userId, role } = await req.json();
      
      // Update the user's app_metadata (Secure bucket for roles)
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { app_metadata: { role } }
      );
      
      if (error) throw error;
  
      return NextResponse.json({ success: true, user: data.user });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
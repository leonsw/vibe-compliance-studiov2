"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize Admin Client (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * PROVISION NEW USER
 * 1. Creates Auth User (Email/Temp Password)
 * 2. Creates Profile entry
 * 3. Assigns Role
 * 4. Sets "Force Password Change" flag
 */
export async function provisionUser(formData: FormData) {
  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const roleId = formData.get("roleId") as string;
  const groupId = formData.get("groupId") as string;
  const tempPassword = formData.get("tempPassword") as string;

  try {
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw new Error("Auth Error: " + authError.message);
    const userId = authData.user.id;

    // 2. Create Profile & Link Group (Note: Triggers might handle profile creation, 
    // but we update it here to be safe and set flags)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        group_id: groupId || null,
        force_password_change: true, // <--- CRITICAL REQUIREMENT
        is_active: true,
        last_password_change: new Date().toISOString()
      });

    if (profileError) throw new Error("Profile Error: " + profileError.message);

    // 3. Assign Role
    if (roleId) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role_id: roleId });

      if (roleError) throw new Error("Role Assignment Error: " + roleError.message);
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true, message: `User ${email} created successfully.` };

  } catch (error: any) {
    console.error("Provisioning Failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * UPDATE USER DETAILS
 * Can handle: Role change, Dept change, Locking/Unlocking
 */
export async function updateUser(formData: FormData) {
    const userId = formData.get("userId") as string;
    const fullName = formData.get("fullName") as string;
    const roleId = formData.get("roleId") as string;
    const departmentId = formData.get("departmentId") as string;
    const lockedUntil = formData.get("lockedUntil") as string; // "null" or ISO date
  
    try {
      // 1. Update Profile (Name, Dept, Lockout)
      const updatePayload: any = { full_name: fullName };
      if (departmentId) updatePayload.department_id = departmentId;
      
      // Handle Lockout Logic
      if (lockedUntil === "unlock") {
          updatePayload.locked_until = null; // Clear lock
      } else if (lockedUntil === "lock_forever") {
          const farFuture = new Date();
          farFuture.setFullYear(2099);
          updatePayload.locked_until = farFuture.toISOString();
      }
  
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);
  
      if (profileError) throw new Error("Profile Update Failed: " + profileError.message);
  
      // 2. Update Role (If changed)
      // We first delete existing role, then add new one (assuming 1 role per user for simplicity)
      if (roleId) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: roleId });
      }
  
      revalidatePath("/dashboard/admin/users");
      return { success: true, message: "User updated successfully" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
/**
 * DEPROVISION USER (Soft Delete or Hard Delete)
 */
export async function deleteUser(userId: string) {
  try {
    // 1. Remove from Auth (Prevents Login)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // 2. Mark Profile as Inactive (Audit Trail)
    // Note: If you have ON DELETE CASCADE on profiles, the row is gone. 
    // If you want to keep history, remove CASCADE from your schema or use a soft_delete column.
    // For now, let's assume standard hard delete for clean-up.

    revalidatePath("/dashboard/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
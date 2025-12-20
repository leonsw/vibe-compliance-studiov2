"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize "God Mode" Client for Admin Actions
// We use this because standard users cannot delete other users from the Auth database.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// --- 1. PROVISION (INVITE) USER ---
export async function provisionUser(formData: FormData) {
  const email = formData.get("email") as string;
  const fullName = formData.get("fullName") as string;
  const roleId = formData.get("roleId") as string;
  const groupId = formData.get("groupId") as string;
  const departmentId = formData.get("departmentId") as string;

  try {
    // A. Send Invitation via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/update-password`
    });

    if (authError) throw new Error(authError.message);
    const userId = authData.user.id;

    // B. Create Profile Record
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        group_id: groupId || null,
        department_id: departmentId || null,
        is_active: true,
        force_password_change: true,
        last_password_change: new Date(0).toISOString()
      });

    if (profileError) throw new Error("Profile Error: " + profileError.message);

    // C. Assign Role
    if (roleId) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: roleId });
    }

    revalidatePath("/dashboard/admin/users");
    return { success: true, message: `Invitation sent to ${email}` };

  } catch (error: any) {
    console.error("Provisioning Failed:", error);
    return { success: false, error: error.message };
  }
}

// --- 2. DELETE USER ---
export async function deleteUser(userId: string) {
  try {
    // Delete from Auth (Cascade should handle profile, but we do both for safety)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    revalidatePath("/dashboard/admin/users");
    return { success: true, message: "User deleted successfully." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- 3. UPDATE USER ---
export async function updateUser(userId: string, formData: FormData) {
    const roleId = formData.get("roleId") as string;
    const groupId = formData.get("groupId") as string;
    const departmentId = formData.get("departmentId") as string;

    try {
        // Update Profile Fields
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
                group_id: groupId || null,
                department_id: departmentId || null,
            })
            .eq("id", userId);

        if (profileError) throw profileError;

        // Update Role (Delete old, Insert new)
        if (roleId) {
            await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
            await supabaseAdmin.from("user_roles").insert({ user_id: userId, role_id: roleId });
        }

        revalidatePath("/dashboard/admin/users");
        return { success: true, message: "User updated successfully." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- 4. TOGGLE LOCK / ACTIVE STATUS ---
export async function toggleUserStatus(userId: string, isLocked: boolean) {
    try {
        const updates = isLocked 
            ? { locked_until: null, is_active: true } // Unlock
            : { locked_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), is_active: false }; // Lock for 1 year

        const { error } = await supabaseAdmin
            .from("profiles")
            .update(updates)
            .eq("id", userId);

        if (error) throw error;
        
        revalidatePath("/dashboard/admin/users");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
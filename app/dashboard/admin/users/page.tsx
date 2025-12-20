import { createClient } from "@/utils/supabase/server";
import UserClient from "./UserClient";
import { redirect } from "next/navigation";

export default async function UserManagementPage() {
  const supabase = await createClient();

  // 1. VERIFY AUTH
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/login");
  }

  // 2. FETCH DATA IN PARALLEL
  const [rolesRes, groupsRes, deptsRes, usersRes] = await Promise.all([
    supabase.from("roles").select("id, name"),
    supabase.from("groups").select("id, name"),
    supabase.from("departments").select("id, name"),
    supabase.from("profiles")
      .select(`
        *, 
        user_roles(role_id, roles(name)), 
        groups:group_id(id, name),
        departments:department_id(id, name)
      `)
      .order("created_at", { ascending: false })
  ]);

  // --- DEBUGGING LOGS (Check your VS Code Terminal) ---
  console.log("--- DEBUGGING USER PAGE ---");
  console.log("Current Logged In User ID:", user.id);
  
  if (usersRes.error) {
    console.error("❌ ERROR Fetching Profiles:", usersRes.error.message);
  } else {
    console.log("✅ Profiles Found:", usersRes.data?.length);
    // Print the first user to see if the structure is correct
    if (usersRes.data && usersRes.data.length > 0) {
       console.log("First Profile Sample:", JSON.stringify(usersRes.data[0], null, 2));
    } else {
       console.log("⚠️ Profiles table returned 0 rows.");
    }
  }
  // ----------------------------------------------------

  // 3. RENDER CLIENT COMPONENT WITH DATA
  return (
    <UserClient 
      initialUsers={usersRes.data || []}
      roles={rolesRes.data || []}
      groups={groupsRes.data || []}
      departments={deptsRes.data || []}
    />
  );
}
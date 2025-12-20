import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Sidebar from "@/components/sidebar"; // Assuming you have this, or I can provide a simple one
import TopNav from "@/components/topnav";   // Optional: If you use a top navigation bar

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Initialize Supabase on the Server
  const supabase = await createClient();
  // 2. Fetch the User (Secure Server-Side Check)
  const { data: { user }, error } = await supabase.auth.getUser();

  // 3. Security Fallback: If no user, kick to login
  // (Your middleware should catch this first, but this is a safety net)
  if (error || !user) {
    redirect("/login");
  }

  // 4. Fetch Profile (Optional: If your Sidebar needs the name/role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      
      {/* SIDEBAR - Fixed on the left */}
      <aside className="w-64 fixed inset-y-0 z-50 hidden md:flex flex-col border-r border-gray-800 bg-[#1e293b]">
        {/* Pass user profile to Sidebar so it can display "Hello, Admin" */}
        <Sidebar user={profile} /> 
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        
        {/* TOP NAV (Mobile toggle & Breadcrumbs usually go here) */}
        {/* <TopNav user={profile} /> */}

        <main className="flex-1 p-0 overflow-y-auto">
           {children}
        </main>
        
      </div>
    </div>
  );
}
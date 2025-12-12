import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use Service Role Key to ensure we can read everything and bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    const { scheduleId } = await req.json();
    console.log(`[Auto-Auditor] Received Request for Schedule ID: ${scheduleId}`);

    // 1. Fetch Schedule (SIMPLE SELECT - No Joins to avoid FK errors)
    const { data: schedule, error: schError } = await supabase
      .from("assessment_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();

    if (schError || !schedule) {
        console.error("Schedule Fetch Error:", schError);
        throw new Error("Schedule not found in DB");
    }

    // 2. Fetch Standard Details (Separate Query to be safe)
    const { data: stdData } = await supabase
        .from("standards_library")
        .select("name")
        .eq("id", schedule.standard_id)
        .single();
        
    const standardName = stdData ? stdData.name : "Unknown Standard";

    console.log(`[Auto-Auditor] Running '${schedule.name}' against Standard: ${standardName}`);

    // 3. Create the Assessment
    const title = `AUTO: ${schedule.name} - ${new Date().toLocaleDateString()}`;
    
    const { data: assessment, error: asmError } = await supabase
      .from("assessments")
      .insert({
        title: title,
        system_id: schedule.asset_group, // This contains the System UUID
        standard: standardName,
        status: 'In Progress',
        progress: 0
      })
      .select()
      .single();

    if (asmError) throw asmError;

    // 4. Clone Master Controls
    const { data: masters } = await supabase
      .from("master_controls")
      .select("*")
      .eq("standard_id", schedule.standard_id);

    if (!masters || masters.length === 0) {
        console.warn("No master controls found for this standard.");
    } else {
        const controlsToInsert = masters.map(m => ({
            assessment_id: assessment.id,
            control_code: m.control_code,
            family: m.family,
            description: m.description,
            status: 'Not Started'
        }));

        const { error: cloneError } = await supabase
            .from("controls")
            .insert(controlsToInsert);

        if (cloneError) throw cloneError;
    }

    // 5. Update Schedule Stats
    const nextRun = new Date();
    if (schedule.frequency === 'Weekly') nextRun.setDate(nextRun.getDate() + 7);
    if (schedule.frequency === 'Monthly') nextRun.setDate(nextRun.getDate() + 30);
    if (schedule.frequency === 'Quarterly') nextRun.setDate(nextRun.getDate() + 90);

    await supabase
      .from("assessment_schedules")
      .update({ 
        last_run: new Date().toISOString(),
        next_run: nextRun.toISOString() 
      })
      .eq("id", scheduleId);

    return NextResponse.json({ success: true, assessmentId: assessment.id });

  } catch (error: any) {
    console.error("Automation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
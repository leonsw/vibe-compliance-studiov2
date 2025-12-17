import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { streamText, generateObject, type CoreMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// 1. Expanded Intent Schema
const IntentSchema = z.object({
  action: z.enum(["create_assessment", "create_bulk_assessment", "chat"])
    .describe("The user's intent. Use 'create_bulk_assessment' if they say 'all apps', 'in-scope systems', or plural."),
  standard_name: z.string().optional().describe("Standard name (e.g. CMMC, PCI)."),
  asset_name: z.string().optional().describe("System name (only for single assessment)."),
});

// Helper: Create Single Assessment
async function createAssessment(supabase: any, standard: any, system: any) {
  // Check if active assessment already exists to avoid duplicates (Optional safety)
  const { data: existing } = await supabase
    .from("assessments")
    .select("id")
    .eq("system_id", system.id)
    .eq("standard", standard.name)
    .eq("status", "In Progress")
    .maybeSingle();

  if (existing) return `Skipped ${system.name} (Already In Progress)`;

  // Create Assessment
  const title = `AGENT: ${standard.name} on ${system.name}`;
  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({ 
      title, 
      system_id: system.id, 
      standard: standard.name, 
      status: "In Progress", 
      progress: 0 
    })
    .select()
    .single();
  
  if (error) return `Failed ${system.name}: ${error.message}`;

  // Clone Controls
  const { data: masters } = await supabase
    .from("master_controls")
    .select("*")
    .eq("standard_id", standard.id);

  if (masters?.length) {
    const controls = masters.map((m: any) => ({
      assessment_id: assessment.id,
      control_code: m.control_code,
      family: m.family,
      description: m.description,
      status: "Not Started",
    }));
    await supabase.from("controls").insert(controls);
  }

  return `Started ${system.name}`;
}

// 2. Main Handler
export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();
    const lastMessage = messages[messages.length - 1].content as string;

    // A. Detect Intent
    const { object: intent } = await generateObject({
      model: openai("gpt-4o"),
      schema: IntentSchema,
      prompt: `Analyze: "${lastMessage}". 
               - If user wants to audit ONE specific app -> 'create_assessment'.
               - If user wants to audit ALL apps, or "in-scope" apps -> 'create_bulk_assessment'.
               - Otherwise -> 'chat'.`,
    });

    let toolResult = "";

    // B. Execute Logic
    if (intent.action !== "chat" && intent.standard_name) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // 1. Find Standard
      const { data: stds } = await supabase
        .from("standards_library")
        .select("id, name")
        .ilike("name", `%${intent.standard_name}%`)
        .limit(1);

      if (!stds?.length) {
        toolResult = `Error: Standard "${intent.standard_name}" not found.`;
      } else {
        const standard = stds[0];

        // 2. BULK MODE
        if (intent.action === "create_bulk_assessment") {
            console.log(`[Agent] Bulk Trigger: ${standard.name}`);
            
            // Find systems that have this standard in their tags
            // Note: applicable_standards is a text array in DB
            const { data: systems } = await supabase
                .from("systems")
                .select("*")
                .contains("applicable_standards", [standard.name]);

            if (!systems || systems.length === 0) {
                toolResult = `Found 0 systems tagged with "${standard.name}". Please go to Assets and tag them first.`;
            } else {
                const results = await Promise.all(systems.map(sys => createAssessment(supabase, standard, sys)));
                toolResult = `BULK OPERATION COMPLETE:\n- ${results.join("\n- ")}`;
            }
        } 
        
        // 3. SINGLE MODE
        else if (intent.action === "create_assessment" && intent.asset_name) {
            const { data: sys } = await supabase
                .from("systems")
                .select("*")
                .ilike("name", `%${intent.asset_name}%`)
                .limit(1);
            
            if (!sys?.length) {
                toolResult = `Error: Asset "${intent.asset_name}" not found.`;
            } else {
                toolResult = await createAssessment(supabase, standard, sys[0]);
            }
        }
      }
    }

    // C. Reply to User
    const systemContext = `
      You are VibeBot, an AI Compliance Officer.
      
      ${toolResult ? `SYSTEM UPDATE: \n${toolResult}` : ""}
      
      Instructions:
      1. If you just ran a Bulk Operation, list the systems that were started.
      2. If you found 0 systems, politely tell the user to go to the Assets page and tag their apps with the standard.
      3. Be concise and professional.
    `;

    const result = await streamText({
      model: openai("gpt-4o"),
      system: systemContext,
      messages,
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("[Agent Error]", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { streamText, generateObject, type CoreMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// Defines the "Intent" we want to detect
const IntentSchema = z.object({
  action: z.enum(["create_assessment", "chat"]).describe("The user's intent."),
  standard_name: z.string().optional().describe("Standard name if creating assessment."),
  asset_name: z.string().optional().describe("System/Asset name if creating assessment."),
});

// Helper Function: The "Tool" Logic (Decoupled from the AI SDK)
async function createAssessment(standard_name: string, asset_name: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Find Standard
  const { data: stds } = await supabase
    .from("standards_library")
    .select("id, name")
    .ilike("name", `%${standard_name}%`)
    .limit(1);
  if (!stds?.length) return `Error: Standard "${standard_name}" not found.`;
  const standard = stds[0];

  // 2. Find System
  const { data: sys } = await supabase
    .from("systems")
    .select("id, name")
    .ilike("name", `%${asset_name}%`)
    .limit(1);
  if (!sys?.length) return `Error: System "${asset_name}" not found.`;
  const system = sys[0];

  // 3. Create Assessment
  const title = `AGENT: ${standard.name} on ${system.name}`;
  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({ title, system_id: system.id, standard: standard.name, status: "In Progress", progress: 0 })
    .select().single();
  
  if (error) return `Error creating assessment: ${error.message}`;

  // 4. Clone Controls
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

  return `SUCCESS: Created Assessment #${assessment.id} for ${standard.name} on ${system.name}.`;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: CoreMessage[] } = await req.json();
    const lastMessage = messages[messages.length - 1].content as string;

    // STEP 1: Determine Intent (Is this a tool call or just chat?)
    // We use a fast call to check if the user is trying to start an assessment
    const { object: intent } = await generateObject({
      model: openai("gpt-4o"),
      schema: IntentSchema,
      prompt: `Analyze the user's last message: "${lastMessage}". 
               If they want to start/launch/begin an audit or assessment, extract the standard and asset names.
               Otherwise, classify as "chat".`,
    });

    let toolResult = "";

    // STEP 2: Execute Logic Manually (No "Tools" array to break)
    if (intent.action === "create_assessment" && intent.standard_name && intent.asset_name) {
      console.log(`[Agent] Manual Trigger: ${intent.standard_name} on ${intent.asset_name}`);
      toolResult = await createAssessment(intent.standard_name, intent.asset_name);
    }

    // STEP 3: Generate Final Response
    // We inject the tool result as a "System Note" so the AI knows what happened.
    const systemContext = `
      You are VibeBot, an AI Compliance Officer.
      
      ${toolResult ? `IMPORTANT UPDATE: You just performed an action. Result: "${toolResult}". Tell the user this news.` : ""}
      
      If the user asked to start an assessment and you see a SUCCESS message above, confirm it excitedly.
      If you see an ERROR message, explain what went wrong.
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
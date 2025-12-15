import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { streamText, tool, type CoreMessage } from "ai";
import { z } from "zod";

export const maxDuration = 60;

// 1. Define the Schema ONCE
const AssessmentSchema = z.object({
  standard_name: z
    .string()
    .describe("The name of the compliance standard (e.g., ISO 27001, SOC 2)."),
  asset_name: z
    .string()
    .describe("The name of the system or asset to be audited."),
});

// 2. Define the Tool with DUAL COMPATIBILITY
const assessmentTool = tool({
  description: "Launch a compliance audit/assessment for a specific standard and system.",
  
  // FIX: Provide BOTH keys to satisfy any version of the AI SDK
  parameters: AssessmentSchema,  // For SDK v3.1+ (New)
  inputSchema: AssessmentSchema, // For SDK v3.0 (Old)

  execute: async (args: any) => {
    // Destructure safely
    const { standard_name, asset_name } = args;

    console.log(`[Agent] 1. Triggering Audit: ${standard_name} on ${asset_name}`);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return "System Error: Server configuration is missing database keys.";
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // A. Find Standard
    const { data: stds } = await supabase
      .from("standards_library")
      .select("id, name")
      .ilike("name", `%${standard_name}%`)
      .limit(1);

    if (!stds || stds.length === 0) {
      return `Error: I couldn't find a standard matching "${standard_name}".`;
    }
    const standard = stds[0];

    // B. Find System
    const { data: sys } = await supabase
      .from("systems")
      .select("id, name")
      .ilike("name", `%${asset_name}%`)
      .limit(1);

    if (!sys || sys.length === 0) {
      return `Error: I couldn't find an asset matching "${asset_name}".`;
    }
    const system = sys[0];

    // C. Create Assessment
    const title = `AGENT-INITIATED: ${standard.name} on ${system.name}`;
    
    const { data: assessment, error: asmError } = await supabase
      .from("assessments")
      .insert({
        title,
        system_id: system.id,
        standard: standard.name,
        status: "In Progress",
        progress: 0,
      })
      .select()
      .single();

    if (asmError) {
      console.error("[Agent] Insert Error:", asmError);
      return `System Error: ${asmError.message}`;
    }

    // D. Clone Controls
    const { data: masters } = await supabase
      .from("master_controls")
      .select("*")
      .eq("standard_id", standard.id);

    if (masters && masters.length > 0) {
      const controlsToInsert = masters.map((m: any) => ({
        assessment_id: assessment.id,
        control_code: m.control_code,
        family: m.family,
        description: m.description,
        status: "Not Started",
      }));

      await supabase.from("controls").insert(controlsToInsert);
    }

    return `Success! I have launched assessment "${title}" (ID: ${assessment.id}).`;
  },
} as any);

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count: sysCount } = await supabase.from("systems").select("*", { count: "exact", head: true });
  const { count: stdCount } = await supabase.from("standards_library").select("*", { count: "exact", head: true });

  const systemContext = `
    You are VibeBot, an Autonomous Compliance Officer.
    Environment State: ${sysCount} Systems, ${stdCount} Standards.
    If resources are missing, guide the user to the dashboard.
  `;

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemContext,
    messages,
    tools: {
      execute_assessment: assessmentTool,
    },
    // @ts-ignore: Force TS to ignore this if the types are still stale
    maxSteps: 5,
  });

  return result.toTextStreamResponse();
}